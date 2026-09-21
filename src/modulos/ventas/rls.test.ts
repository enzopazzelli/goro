import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Corre contra un proyecto Supabase de PRUEBA, nunca el real — mismo
 * criterio que src/modulos/inventario/rls.test.ts. Excluido de
 * `npm run test:unit` por el glob de package.json.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const clavePublica = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const claveServicio = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const servicio = createClient(url, claveServicio);

async function crearUsuarioDePrueba(rol: "duenio" | "colaborador") {
  const usuario = `test-${rol}-${Date.now()}`;
  const email = `${usuario}@heladeria.local`;
  const password = "prueba-123456";

  const { data, error } = await servicio.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw error;

  if (rol === "duenio") {
    await servicio.from("perfiles").update({ rol: "duenio" }).eq("id", data.user.id);
  }

  const cliente = createClient(url, clavePublica);
  const { error: errorIngreso } = await cliente.auth.signInWithPassword({ email, password });
  if (errorIngreso) throw errorIngreso;

  return { id: data.user.id, cliente };
}

describe("RLS: ventas", () => {
  let colaborador: Awaited<ReturnType<typeof crearUsuarioDePrueba>>;
  let anonimo: ReturnType<typeof createClient>;
  let saborId: number;
  let baldeId: number;
  let formatoId: number;

  beforeAll(async () => {
    colaborador = await crearUsuarioDePrueba("colaborador");
    anonimo = createClient(url, clavePublica);

    const { data: sabor } = await servicio
      .from("sabores")
      .insert({ nombre: `Sabor de venta ${Date.now()}` })
      .select("id")
      .single();
    saborId = sabor!.id;

    const { data: balde } = await servicio
      .from("baldes")
      .insert({
        codigo: `GB${String(Date.now()).slice(-7)}`,
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
        nombre: `Formato de venta ${Date.now()}`,
        gramos: 250,
        cantidad_sabores: 1,
        precio: 3000,
      })
      .select("id")
      .single();
    formatoId = formato!.id;
  });

  afterAll(async () => {
    await servicio.from("baldes").delete().eq("id", baldeId);
    await servicio.from("formatos").delete().eq("id", formatoId);
    await servicio.from("sabores").delete().eq("id", saborId);
    await servicio.auth.admin.deleteUser(colaborador.id);
  });

  it("sin sesión no se puede leer ventas", async () => {
    const { data, error } = await anonimo.from("ventas").select("id");
    expect(data).toEqual([]);
    expect(error).toBeNull();
  });

  it("un colaborador no puede insertar directo en ventas", async () => {
    const { error } = await colaborador.cliente
      .from("ventas")
      .insert({ medio_pago: "efectivo", total: 100 });
    expect(error).not.toBeNull();
  });

  it("no se puede llamar a aplicar_movimiento_balde por RPC directo", async () => {
    const { error } = await colaborador.cliente.rpc("aplicar_movimiento_balde", {
      p_balde_id: baldeId,
      p_tipo: "ajuste",
      p_kg: 1,
      p_venta_item_id: null,
    });
    expect(error).not.toBeNull();
  });

  it("un colaborador puede registrar una venta, y anularla revierte el balde", async () => {
    const { data: ventaId, error } = await colaborador.cliente.rpc("registrar_venta", {
      p_items: [{ formato_id: formatoId, sabor_ids: [saborId] }],
      p_medio_pago: "efectivo",
    });
    expect(error).toBeNull();

    const { data: balde } = await servicio
      .from("baldes")
      .select("kg_restante")
      .eq("id", baldeId)
      .single();
    expect(Number(balde!.kg_restante)).toBeCloseTo(9.75);

    const { error: errorAnular } = await colaborador.cliente.rpc("anular_venta", {
      p_venta_id: ventaId,
    });
    expect(errorAnular).toBeNull();

    const { data: baldeTrasAnular } = await servicio
      .from("baldes")
      .select("kg_restante")
      .eq("id", baldeId)
      .single();
    expect(Number(baldeTrasAnular!.kg_restante)).toBeCloseTo(10);

    const { data: items } = await servicio.from("venta_items").select("id").eq("venta_id", ventaId);
    const itemIds = (items ?? []).map((item) => item.id);
    await servicio.from("movimientos_balde").delete().in("venta_item_id", itemIds);
    await servicio.from("venta_items").delete().eq("venta_id", ventaId);
    await servicio.from("ventas").delete().eq("id", ventaId);
  });

  it("registrar_venta avisa con hint sin_balde_abierto si el sabor no tiene balde abierto", async () => {
    const { data: otroSabor } = await servicio
      .from("sabores")
      .insert({ nombre: `Sabor sin balde ${Date.now()}` })
      .select("id")
      .single();

    const { error } = await colaborador.cliente.rpc("registrar_venta", {
      p_items: [{ formato_id: formatoId, sabor_ids: [otroSabor!.id] }],
      p_medio_pago: "efectivo",
    });

    expect(error).not.toBeNull();
    expect(error!.hint).toBe("sin_balde_abierto");

    await servicio.from("sabores").delete().eq("id", otroSabor!.id);
  });
});
