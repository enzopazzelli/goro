// @vitest-environment node
// Sin jsdom: ahí los clientes de Supabase comparten localStorage y el cliente de servicio
// termina actuando con la sesión de un usuario de prueba, sujeto a RLS.

import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  clavePublica,
  codigoDePrueba,
  crearUsuarioDePrueba,
  kgDe,
  servicio,
  stockDe,
  url,
} from "@/modulos/ventas/utilesRls";

const codigoDeBalde = () => `GB${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;

/**
 * El descarte contra la base de verdad. Lo carga cualquiera con sesión (el
 * colaborador de este archivo no tiene ningún permiso), el costo queda
 * congelado, el stock baja por el ledger y nada se descarta dos veces.
 *
 * Fixture: baldes de $1.000 por 10 kg ($100 el kilo), un formato de 250 g para
 * armar potes y un insumo de $300 la unidad con 10 en stock.
 */
describe("Descarte", () => {
  let colaborador: Awaited<ReturnType<typeof crearUsuarioDePrueba>>;
  let duenio: Awaited<ReturnType<typeof crearUsuarioDePrueba>>;
  let saborId: number;
  let formatoId: number;
  let insumoId: number;
  const baldes: number[] = [];
  const potes: number[] = [];

  /** Un balde abierto nuevo. El abierto que dejó un caso anterior se aparta: hay uno por sabor. */
  async function baldeAbierto(kgRestante: number) {
    await servicio
      .from("baldes")
      .update({ estado: "canjeado", salio_en: new Date().toISOString() })
      .eq("sabor_id", saborId)
      .eq("estado", "abierto");
    const { data } = await servicio
      .from("baldes")
      .insert({
        codigo: codigoDeBalde(),
        sabor_id: saborId,
        kg_inicial: 10,
        kg_restante: kgRestante,
        estado: "abierto",
        costo: 1000,
        costo_envase: 500,
      })
      .select("id")
      .single();
    baldes.push(data!.id);
    return data!.id as number;
  }

  async function armarPote(baldeId: number) {
    const { data, error } = await duenio.cliente.rpc("armar_pote", {
      p_formato_id: formatoId,
      p_balde_id: baldeId,
      p_peso_g: 250,
    });
    expect(error).toBeNull();
    potes.push(data as number);
    return data as number;
  }

  const descartesDe = async (columna: "balde_id" | "pote_id", id: number) => {
    const { data } = await servicio.from("descartes").select("*").eq(columna, id).order("id");
    return data ?? [];
  };

  const movimientosDeBalde = async (baldeId: number) => {
    const { data } = await servicio
      .from("movimientos_balde")
      .select("kg, tipo")
      .eq("balde_id", baldeId)
      .order("id");
    return (data ?? []).map((m) => ({ kg: Number(m.kg), tipo: m.tipo }));
  };

  const descartarInsumo = (cantidad: number, clave: string | null = null, motivo = "roto") =>
    colaborador.cliente.rpc("descartar_insumo", {
      p_insumo_id: insumoId,
      p_cantidad: cantidad,
      p_motivo: motivo,
      p_nota: null,
      p_clave: clave,
    });

  beforeAll(async () => {
    colaborador = await crearUsuarioDePrueba("colaborador");
    duenio = await crearUsuarioDePrueba("duenio");
    // Sin ningún permiso: descartar no pide ninguno.
    await servicio.from("perfiles").update({ permisos: [] }).eq("id", colaborador.id);

    const { data: sabor } = await servicio
      .from("sabores")
      .insert({ nombre: `Sabor de descarte ${Date.now()}` })
      .select("id")
      .single();
    saborId = sabor!.id;

    const { data: formato } = await servicio
      .from("formatos")
      .insert({
        nombre: `Pote de descarte ${Date.now()}`,
        gramos: 250,
        cantidad_sabores: 1,
        precio: 3000,
      })
      .select("id")
      .single();
    formatoId = formato!.id;

    const { data: insumo } = await servicio
      .from("insumos")
      .insert({
        nombre: `Cucurucho de descarte ${Date.now()}`,
        codigo: codigoDePrueba(),
        unidad: "u",
        tipo: "insumo",
        cantidad: 10,
        minimo: 0,
        costo: 300,
      })
      .select("id")
      .single();
    insumoId = insumo!.id;
  });

  afterAll(async () => {
    await servicio.from("descartes").delete().in("creado_por", [colaborador.id, duenio.id]);
    await servicio.from("movimientos_balde").delete().in("balde_id", baldes);
    await servicio.from("potes").delete().in("id", potes);
    await servicio.from("movimientos_insumo").delete().eq("insumo_id", insumoId);
    await servicio.from("insumos").delete().eq("id", insumoId);
    await servicio.from("baldes").delete().in("id", baldes);
    await servicio.from("formatos").delete().eq("id", formatoId);
    await servicio.from("sabores").delete().eq("id", saborId);
    await servicio.auth.admin.deleteUser(colaborador.id);
    await servicio.auth.admin.deleteUser(duenio.id);
  });

  it("sin sesión no se lee ni se descarta nada", async () => {
    const anonimo = createClient(url, clavePublica);
    const baldeId = await baldeAbierto(1);
    const stock = await stockDe(insumoId);

    expect((await anonimo.from("descartes").select("id")).error).not.toBeNull();
    const intentos = [
      anonimo.rpc("vaciar_balde", { p_balde_id: baldeId, p_kg_tirado: 0.5 }),
      anonimo.rpc("descartar_insumo", { p_insumo_id: insumoId, p_cantidad: 1, p_motivo: "roto" }),
      anonimo.rpc("costo_del_descarte", { p_desde: "2020-01-01", p_hasta: "2030-01-01" }),
    ];
    for (const { error } of await Promise.all(intentos)) expect(error).not.toBeNull();

    expect(await kgDe(baldeId)).toBe(1);
    expect(await stockDe(insumoId)).toBe(stock);
  });

  it("nadie escribe en descartes directo: la única puerta son las funciones", async () => {
    const { error } = await colaborador.cliente.from("descartes").insert({
      tipo: "insumo",
      insumo_id: insumoId,
      cantidad: 1,
      unidad: "u",
      motivo: "roto",
      costo: 0,
      creado_por: colaborador.id,
    });
    expect(error).not.toBeNull();
  });

  it("se terminó sin tirar nada: sin descarte, y lo estimado se da de baja como ajuste", async () => {
    const baldeId = await baldeAbierto(3.5);

    const { error } = await colaborador.cliente.rpc("vaciar_balde", {
      p_balde_id: baldeId,
      p_kg_tirado: 0,
    });
    expect(error).toBeNull();

    expect(await kgDe(baldeId)).toBe(0);
    expect(await movimientosDeBalde(baldeId)).toEqual([{ kg: -3.5, tipo: "ajuste" }]);
    expect(await descartesDe("balde_id", baldeId)).toEqual([]);
  });

  it("se tiró menos de lo estimado: la diferencia es ajuste y lo tirado es descarte con su costo", async () => {
    const baldeId = await baldeAbierto(3.5);

    const { error } = await colaborador.cliente.rpc("vaciar_balde", {
      p_balde_id: baldeId,
      p_kg_tirado: 0.4,
    });
    expect(error).toBeNull();

    expect(await kgDe(baldeId)).toBe(0);
    expect(await movimientosDeBalde(baldeId)).toEqual([
      { kg: -3.1, tipo: "ajuste" },
      { kg: -0.4, tipo: "descarte" },
    ]);
    const [descarte] = await descartesDe("balde_id", baldeId);
    expect(descarte).toMatchObject({
      tipo: "balde",
      unidad: "kg",
      motivo: "resto_de_balde",
      costo: 40,
      creado_por: colaborador.id,
    });
    expect(Number(descarte.cantidad)).toBe(0.4);
  });

  it("se tiró más de lo estimado: el ajuste es positivo y el balde igual termina en cero", async () => {
    const baldeId = await baldeAbierto(0.2);

    const { error } = await colaborador.cliente.rpc("vaciar_balde", {
      p_balde_id: baldeId,
      p_kg_tirado: 0.5,
    });
    expect(error).toBeNull();

    expect(await kgDe(baldeId)).toBe(0);
    expect(await movimientosDeBalde(baldeId)).toEqual([
      { kg: 0.3, tipo: "ajuste" },
      { kg: -0.5, tipo: "descarte" },
    ]);
    expect((await descartesDe("balde_id", baldeId))[0].costo).toBe(50);
  });

  it("no se puede tirar más de lo que traía el balde, y entonces no cambia nada", async () => {
    const baldeId = await baldeAbierto(2);

    const { error } = await colaborador.cliente.rpc("vaciar_balde", {
      p_balde_id: baldeId,
      p_kg_tirado: 10.5,
    });
    expect(error?.message).toContain("entre 0 y");

    expect(await kgDe(baldeId)).toBe(2);
    expect(await movimientosDeBalde(baldeId)).toEqual([]);
    const { data } = await servicio.from("baldes").select("estado").eq("id", baldeId).single();
    expect(data!.estado).toBe("abierto");
  });

  it("un pote se descarta una sola vez, sin permiso, con su motivo y su costo", async () => {
    const baldeId = await baldeAbierto(10);
    const poteId = await armarPote(baldeId);

    const primero = await colaborador.cliente.rpc("descartar_pote", {
      p_pote_id: poteId,
      p_motivo: "vencido",
      p_nota: "  se cortó la luz  ",
    });
    expect(primero.error).toBeNull();
    const segundo = await colaborador.cliente.rpc("descartar_pote", {
      p_pote_id: poteId,
      p_motivo: "vencido",
    });
    expect(segundo.error?.message).toContain("sigue en el freezer");

    const descartes = await descartesDe("pote_id", poteId);
    expect(descartes).toHaveLength(1);
    expect(descartes[0]).toMatchObject({
      tipo: "pote",
      balde_id: baldeId,
      unidad: "kg",
      motivo: "vencido",
      nota: "se cortó la luz",
      costo: 25,
    });
    expect(Number(descartes[0].cantidad)).toBe(0.25);
  });

  it("un pote no es un resto de balde", async () => {
    const poteId = await armarPote(await baldeAbierto(10));

    const { error } = await colaborador.cliente.rpc("descartar_pote", {
      p_pote_id: poteId,
      p_motivo: "resto_de_balde",
    });
    expect(error?.message).toContain("resto de balde");
    expect(await descartesDe("pote_id", poteId)).toEqual([]);
  });

  it("la misma clave dos veces es un solo descarte: el stock baja una vez", async () => {
    const antes = await stockDe(insumoId);
    const clave = crypto.randomUUID();

    const primero = await descartarInsumo(2, clave);
    const segundo = await descartarInsumo(2, clave);
    expect(primero.error).toBeNull();
    expect(segundo.error).toBeNull();
    expect(segundo.data).toBe(primero.data);

    expect(await stockDe(insumoId)).toBe(antes - 2);
    const { data } = await servicio.from("descartes").select("costo, unidad").eq("clave", clave);
    expect(data).toEqual([{ costo: 600, unidad: "u" }]);
  });

  it("no se descarta más de lo que hay en stock; todo lo que hay, sí", async () => {
    const antes = await stockDe(insumoId);

    const demasiado = await descartarInsumo(antes + 1);
    expect(demasiado.error?.message).toContain("Avisale al dueño");
    expect(await stockDe(insumoId)).toBe(antes);

    const todo = await descartarInsumo(antes);
    expect(todo.error).toBeNull();
    expect(await stockDe(insumoId)).toBe(0);

    // Stock para los casos que siguen.
    await servicio.from("insumos").update({ cantidad: 10 }).eq("id", insumoId);
  });

  it("un artículo por unidad no se descarta en fracciones, ni con motivo de balde", async () => {
    const antes = await stockDe(insumoId);

    expect((await descartarInsumo(1.5)).error?.message).toContain("entera");
    expect((await descartarInsumo(1, null, "resto_de_balde")).error?.message).toContain(
      "Elegí por qué",
    );
    expect(await stockDe(insumoId)).toBe(antes);
  });

  it("el costo queda congelado: cambiar el costo después no toca lo descartado", async () => {
    const clave = crypto.randomUUID();
    await descartarInsumo(1, clave);

    await servicio.from("insumos").update({ costo: 999 }).eq("id", insumoId);
    const { data } = await servicio.from("descartes").select("costo").eq("clave", clave).single();
    expect(data!.costo).toBe(300);

    await servicio.from("insumos").update({ costo: 300 }).eq("id", insumoId);
  });

  it("costo_del_descarte suma lo del período y nada más", async () => {
    const claves = [crypto.randomUUID(), crypto.randomUUID()];
    for (const clave of claves) expect((await descartarInsumo(1, clave)).error).toBeNull();
    // Un día propio, lejos de lo real: se fechan en 2020.
    await servicio
      .from("descartes")
      .update({ creado_en: "2020-03-01T15:00:00Z" })
      .in("clave", claves);

    const { data, error } = await colaborador.cliente.rpc("costo_del_descarte", {
      p_desde: "2020-03-01T03:00:00Z",
      p_hasta: "2020-03-02T03:00:00Z",
    });
    expect(error).toBeNull();
    expect(Number(data)).toBe(600);
  });
});
