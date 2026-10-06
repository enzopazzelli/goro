// @vitest-environment node
// Sin jsdom: ahí los clientes de Supabase comparten localStorage y el cliente de servicio
// termina actuando con la sesión de un usuario de prueba, sujeto a RLS.

import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { generarCodigo, leerCodigo } from "@/lib/codigos/codigo";
import {
  abrirCajaDePrueba,
  borrarTurnoDePrueba,
  clavePublica,
  codigoDePrueba,
  crearUsuarioDePrueba,
  kgDe,
  limpiarVenta,
  limpiarVentasDe,
  servicio,
  url,
} from "@/modulos/ventas/utilesRls";

const codigoDeBalde = () => `GB${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
const DIA = "2020-05-01";

/**
 * Potes armados y lector de códigos, contra la base de verdad: armar con el peso
 * real, que el precio quede congelado, que un pote no se cobre dos veces, que
 * anular una venta lo devuelva al freezer, y que `resolver_codigo` conteste qué
 * es cada cosa.
 *
 * Fixture: un balde abierto de $1.000 por 10 kg ($100 el kilo) y un formato de
 * 250 g a $3.000 con un envase propio.
 */
describe("Potes armados", () => {
  let colaborador: Awaited<ReturnType<typeof crearUsuarioDePrueba>>;
  let duenio: Awaited<ReturnType<typeof crearUsuarioDePrueba>>;
  let turnoDePrueba: number | null;
  let saborId: number;
  let baldeId: number;
  let formatoId: number;
  let envaseId: number;
  const poteIds: number[] = [];

  const armar = async (peso = 262) => {
    const respuesta = await colaborador.cliente.rpc("armar_pote", {
      p_formato_id: formatoId,
      p_balde_id: baldeId,
      p_peso_g: peso,
    });
    if (!respuesta.error) poteIds.push(respuesta.data as number);
    return respuesta;
  };

  const vender = (poteId: number, clave?: string) =>
    colaborador.cliente.rpc("registrar_venta", {
      p_items: [{ pote_id: poteId }],
      p_medio_pago: "tarjeta",
      ...(clave ? { p_clave: clave } : {}),
    });

  const poteDe = async (id: number) => {
    const { data } = await servicio.from("potes").select("*").eq("id", id).single();
    return data!;
  };

  beforeAll(async () => {
    colaborador = await crearUsuarioDePrueba("colaborador");
    duenio = await crearUsuarioDePrueba("duenio");
    turnoDePrueba = await abrirCajaDePrueba(colaborador.cliente);

    const { data: sabor } = await servicio
      .from("sabores")
      .insert({ nombre: `Sabor de potes ${Date.now()}` })
      .select("id")
      .single();
    saborId = sabor!.id;

    const { data: balde } = await servicio
      .from("baldes")
      .insert({
        codigo: codigoDeBalde(),
        sabor_id: saborId,
        kg_inicial: 10,
        kg_restante: 10,
        estado: "abierto",
        costo: 1000,
        costo_envase: 500,
      })
      .select("id")
      .single();
    baldeId = balde!.id;

    const { data: formato } = await servicio
      .from("formatos")
      .insert({
        nombre: `Pote de prueba ${Date.now()}`,
        gramos: 250,
        cantidad_sabores: 1,
        precio: 3000,
      })
      .select("id")
      .single();
    formatoId = formato!.id;

    const { data: envase } = await servicio
      .from("insumos")
      .insert({
        nombre: `Envase de potes ${Date.now()}`,
        codigo: codigoDePrueba(),
        unidad: "u",
        tipo: "envase",
        formato_id: formatoId,
        cantidad: 100,
        minimo: 0,
        costo: 300,
      })
      .select("id")
      .single();
    envaseId = envase!.id;
  });

  afterAll(async () => {
    await limpiarVentasDe("pote_id", poteIds);
    await servicio.from("movimientos_balde").delete().eq("balde_id", baldeId);
    await servicio.from("descartes").delete().in("pote_id", poteIds);
    await servicio.from("potes").delete().in("id", poteIds);
    await servicio.from("movimientos_insumo").delete().eq("insumo_id", envaseId);
    await servicio.from("insumos").delete().eq("id", envaseId);
    await servicio.from("baldes").delete().eq("sabor_id", saborId);
    await servicio.from("formatos").delete().eq("id", formatoId);
    await servicio.from("sabores").delete().eq("id", saborId);
    await borrarTurnoDePrueba(turnoDePrueba);
    await servicio.auth.admin.deleteUser(colaborador.id);
    await servicio.auth.admin.deleteUser(duenio.id);
  });

  it("armar guarda el peso real, congela el precio y saca el helado del balde por el ledger", async () => {
    const antes = await kgDe(baldeId);
    const { data: id, error } = await armar(262);
    expect(error).toBeNull();

    const pote = await poteDe(id as number);
    expect(pote.peso_g).toBe(262);
    expect(pote.precio).toBe(3000);
    expect(pote.estado).toBe("impreso");
    expect(pote.balde_id).toBe(baldeId);
    // El código sale con el dígito verificador que calcula el sistema (un solo cálculo, dos lenguajes).
    expect(leerCodigo(pote.codigo)).toEqual({ tipo: "P", secuencia: expect.any(Number) });
    expect(pote.codigo).toBe(generarCodigo("P", leerCodigo(pote.codigo)!.secuencia));

    expect(await kgDe(baldeId)).toBeCloseTo(antes - 0.262);
    const { data: movimientos } = await servicio
      .from("movimientos_balde")
      .select("kg, tipo")
      .eq("pote_id", id);
    expect(movimientos!.map((m) => ({ kg: Number(m.kg), tipo: m.tipo }))).toEqual([
      { kg: -0.262, tipo: "armado" },
    ]);
  });

  it("nadie escribe en potes directo: la única puerta son las funciones", async () => {
    const { error } = await colaborador.cliente.from("potes").insert({
      codigo: "GP9999999",
      formato_id: formatoId,
      balde_id: baldeId,
      peso_g: 250,
      precio: 1,
      armado_por: colaborador.id,
    });
    expect(error).not.toBeNull();
  });

  it("un peso fuera de lo razonable para el formato se frena, y no queda nada armado", async () => {
    const antes = await kgDe(baldeId);

    for (const peso of [2620, 26, 0, -5]) {
      const { error } = await armar(peso);
      expect(error).not.toBeNull();
    }
    expect(await kgDe(baldeId)).toBe(antes);
  });

  it("solo se arman potes con un balde abierto, y al que le falta helado se le avisa", async () => {
    const { data: cerrado } = await servicio
      .from("baldes")
      .insert({
        codigo: codigoDeBalde(),
        sabor_id: saborId,
        kg_inicial: 10,
        kg_restante: 10,
        estado: "cerrado",
        costo: 1000,
        costo_envase: 500,
      })
      .select("id")
      .single();
    const alCerrado = await colaborador.cliente.rpc("armar_pote", {
      p_formato_id: formatoId,
      p_balde_id: cerrado!.id,
      p_peso_g: 250,
    });
    expect(alCerrado.error?.message).toContain("balde abierto");

    const { data: casiVacio } = await servicio
      .from("baldes")
      .update({ kg_restante: 0.1 })
      .eq("id", baldeId)
      .select("kg_restante");
    expect(casiVacio).toHaveLength(1);
    const corto = await armar(250);
    expect(corto.error?.hint).toBe("balde_corto");
    await servicio.from("baldes").update({ kg_restante: 9 }).eq("id", baldeId);
  });

  it("cobrar un pote: al precio congelado aunque cambie la lista, una sola vez, y gasta su envase", async () => {
    const { data: id } = await armar(250);
    await servicio.from("formatos").update({ precio: 9999 }).eq("id", formatoId);
    const envaseAntes = (
      await servicio.from("insumos").select("cantidad").eq("id", envaseId).single()
    ).data!.cantidad;

    const { data: ventaId, error } = await vender(id as number);
    await servicio.from("formatos").update({ precio: 3000 }).eq("id", formatoId);
    expect(error).toBeNull();

    const { data: venta } = await servicio
      .from("ventas")
      .select("total")
      .eq("id", ventaId)
      .single();
    expect(venta!.total).toBe(3000);
    expect((await poteDe(id as number)).estado).toBe("vendido");
    const envaseDespues = (
      await servicio.from("insumos").select("cantidad").eq("id", envaseId).single()
    ).data!.cantidad;
    expect(Number(envaseDespues)).toBe(Number(envaseAntes) - 1);

    const otraVez = await vender(id as number);
    expect(otraVez.error?.hint).toBe("pote_no_disponible");

    await colaborador.cliente.rpc("anular_venta", { p_venta_id: ventaId });
    await limpiarVenta(ventaId as number);
  });

  it("dos cobros a la vez del mismo pote: entra uno y el otro avisa", async () => {
    const { data: id } = await armar(250);

    const [a, b] = await Promise.all([
      vender(id as number, crypto.randomUUID()),
      vender(id as number, crypto.randomUUID()),
    ]);

    const entro = [a, b].filter((respuesta) => !respuesta.error);
    expect(entro).toHaveLength(1);
    expect([a, b].find((respuesta) => respuesta.error)?.error?.hint).toBe("pote_no_disponible");

    await colaborador.cliente.rpc("anular_venta", { p_venta_id: entro[0]!.data });
    await limpiarVenta(entro[0]!.data as number);
  });

  it("anular la venta devuelve el pote al freezer, y el helado sigue fuera del balde", async () => {
    const { data: id } = await armar(250);
    const kgConElPote = await kgDe(baldeId);
    const { data: ventaId } = await vender(id as number);

    const { error } = await colaborador.cliente.rpc("anular_venta", { p_venta_id: ventaId });
    expect(error).toBeNull();

    expect((await poteDe(id as number)).estado).toBe("impreso");
    expect(await kgDe(baldeId)).toBeCloseTo(kgConElPote);

    // Y se puede volver a vender.
    const segunda = await vender(id as number);
    expect(segunda.error).toBeNull();
    await colaborador.cliente.rpc("anular_venta", { p_venta_id: segunda.data });
    await limpiarVenta(ventaId as number);
    await limpiarVenta(segunda.data as number);
  });

  it("anular un pote armado por error devuelve el helado al balde; uno vendido no se anula", async () => {
    const antes = await kgDe(baldeId);
    const { data: id } = await armar(262);

    const { error } = await colaborador.cliente.rpc("anular_pote", { p_pote_id: id });
    expect(error).toBeNull();
    expect((await poteDe(id as number)).estado).toBe("anulado");
    expect(await kgDe(baldeId)).toBeCloseTo(antes);

    const { data: vendible } = await armar(250);
    const { data: ventaId } = await vender(vendible as number);
    const sobreVendido = await colaborador.cliente.rpc("anular_pote", { p_pote_id: vendible });
    expect(sobreVendido.error?.message).toContain("sigue en el freezer");

    await colaborador.cliente.rpc("anular_venta", { p_venta_id: ventaId });
    await limpiarVenta(ventaId as number);
  });

  it("descartar es merma: lo puede hacer cualquiera con sesión y el helado NO vuelve", async () => {
    const { data: id } = await armar(250);
    const kgConElPote = await kgDe(baldeId);
    await servicio.from("perfiles").update({ permisos: [] }).eq("id", colaborador.id);

    const sinPermiso = await colaborador.cliente.rpc("descartar_pote", {
      p_pote_id: id,
      p_motivo: "vencido",
    });
    expect(sinPermiso.error).toBeNull();
    expect((await poteDe(id as number)).estado).toBe("descartado");
    expect(await kgDe(baldeId)).toBeCloseTo(kgConElPote);

    await servicio
      .from("perfiles")
      .update({ permisos: ["anular_ventas", "movimientos_caja", "cargar_inventario"] })
      .eq("id", colaborador.id);
  });

  it("resolver_codigo dice qué es cada cosa, sin importar mayúsculas ni espacios, y no inventa", async () => {
    const { data: id } = await armar(250);
    const pote = await poteDe(id as number);
    const { data: balde } = await servicio
      .from("baldes")
      .select("codigo")
      .eq("id", baldeId)
      .single();
    const { data: insumo } = await servicio
      .from("insumos")
      .select("codigo")
      .eq("id", envaseId)
      .single();

    const resolver = (texto: string) =>
      colaborador.cliente.rpc("resolver_codigo", { p_texto: texto });

    expect((await resolver(pote.codigo)).data).toEqual([{ tipo: "pote", id }]);
    expect((await resolver(`  ${pote.codigo.toLowerCase()} `)).data).toEqual([
      { tipo: "pote", id },
    ]);
    expect((await resolver(balde!.codigo)).data).toEqual([{ tipo: "balde", id: baldeId }]);
    expect((await resolver(insumo!.codigo)).data).toEqual([{ tipo: "articulo", id: envaseId }]);
    expect((await resolver("GP0000000")).data).toEqual([]);

    const sinSesion = await createClient(url, clavePublica).rpc("resolver_codigo", {
      p_texto: pote.codigo,
    });
    expect(sinSesion.error?.code).toBe("42501");
  });

  it("un balde escaneado se vende ESE, no el más viejo del sabor", async () => {
    await servicio
      .from("baldes")
      .update({ estado: "canjeado", salio_en: new Date().toISOString() })
      .eq("sabor_id", saborId)
      .eq("estado", "cerrado");
    const nuevo = async () =>
      (
        await servicio
          .from("baldes")
          .insert({
            codigo: codigoDeBalde(),
            sabor_id: saborId,
            kg_inicial: 10,
            kg_restante: 10,
            estado: "cerrado",
            costo: 1000,
            costo_envase: 500,
          })
          .select("id")
          .single()
      ).data!.id as number;
    const viejo = await nuevo();
    const elegido = await nuevo();
    await servicio.from("sabores").update({ precio_balde: 80000 }).eq("id", saborId);

    const { data: ventaId, error } = await colaborador.cliente.rpc("registrar_venta", {
      p_items: [{ balde_sabor_id: saborId, balde_id: elegido }],
      p_medio_pago: "tarjeta",
    });
    expect(error).toBeNull();

    const { data: estados } = await servicio
      .from("baldes")
      .select("id, estado")
      .in("id", [viejo, elegido]);
    expect(estados!.find((b) => b.id === elegido)!.estado).toBe("vendido");
    expect(estados!.find((b) => b.id === viejo)!.estado).toBe("cerrado");

    await colaborador.cliente.rpc("anular_venta", { p_venta_id: ventaId });
    await limpiarVenta(ventaId as number);
    await limpiarVentasDe("balde_id", [viejo, elegido]);
    await servicio.from("movimientos_balde").delete().in("balde_id", [viejo, elegido]);
    await servicio.from("baldes").delete().in("id", [viejo, elegido]);
    await servicio.from("sabores").update({ precio_balde: null }).eq("id", saborId);
  });

  it("el Panel cuenta un pote vendido: sus kilos, el costo de su helado y su nombre", async () => {
    await servicio.from("baldes").update({ kg_restante: 9 }).eq("id", baldeId);
    const { data: id } = await armar(250);
    const { data: ventaId } = await vender(id as number);
    await servicio
      .from("ventas")
      .update({ creado_en: `${DIA}T15:00:00Z` })
      .eq("id", ventaId);

    const rango = { p_desde: `${DIA}T03:00:00Z`, p_hasta: "2020-05-02T03:00:00Z" };
    const [kilos, costos, articulos] = await Promise.all([
      colaborador.cliente.rpc("kilos_por_sabor", rango),
      colaborador.cliente.rpc("costo_de_lo_vendido", rango),
      colaborador.cliente.rpc("unidades_por_articulo", rango),
    ]);

    expect(kilos.data).toEqual([{ sabor_id: saborId, sabor_nombre: expect.any(String), kg: 0.25 }]);
    // 250 g de un balde de $100 el kilo, más el envase de $300.
    expect(Number(costos.data![0].costo_helado)).toBeCloseTo(25);
    expect(Number(costos.data![0].costo_insumos)).toBe(300);
    expect(articulos.data).toEqual([
      expect.objectContaining({
        pote_formato_nombre: expect.stringContaining("Pote de prueba"),
        pote_sabor_nombre: expect.stringContaining("Sabor de potes"),
        unidades: 1,
        total: 3000,
      }),
    ]);

    await colaborador.cliente.rpc("anular_venta", { p_venta_id: ventaId });
    await limpiarVenta(ventaId as number);
  });
});
