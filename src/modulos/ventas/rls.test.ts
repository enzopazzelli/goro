// @vitest-environment node
// Sin jsdom: ahí los clientes de Supabase comparten localStorage y el cliente de servicio
// termina actuando con la sesión de un usuario de prueba, sujeto a RLS.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  abrirCajaDePrueba,
  borrarTurnoDePrueba,
  clavePublica,
  crearUsuarioDePrueba,
  kgDe,
  limpiarVenta,
  limpiarVentasDe,
  servicio,
  url,
} from "./utilesRls";
import { createClient } from "@supabase/supabase-js";

describe("RLS: ventas", () => {
  let colaborador: Awaited<ReturnType<typeof crearUsuarioDePrueba>>;
  let anonimo: ReturnType<typeof createClient>;
  let saborId: number;
  let baldeId: number;
  let formatoId: number;
  let turnoDePrueba: number | null;

  beforeAll(async () => {
    colaborador = await crearUsuarioDePrueba("colaborador");
    anonimo = createClient(url, clavePublica);
    turnoDePrueba = await abrirCajaDePrueba(colaborador.cliente);

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
    // La anulación deja un movimiento sin venta_item_id que el test no borra
    // solo, y sin sacarlo la foreign key impide borrar el balde y el usuario.
    await limpiarVentasDe("formato_id", [formatoId]);
    await servicio.from("movimientos_balde").delete().eq("balde_id", baldeId);
    await servicio.from("baldes").delete().eq("id", baldeId);
    await servicio.from("formatos").delete().eq("id", formatoId);
    await servicio.from("sabores").delete().eq("id", saborId);
    await borrarTurnoDePrueba(turnoDePrueba);
    await servicio.auth.admin.deleteUser(colaborador.id);
  });

  it("sin sesión no se puede leer ventas", async () => {
    const { data } = await anonimo.from("ventas").select("id");
    // Sin privilegios sobre la tabla, PostgREST responde con error; con RLS a
    // secas, con lista vacía. Las dos cosas significan "no se ve nada".
    expect(data ?? []).toEqual([]);
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
      // Un delta chico y válido: si falla tiene que ser por falta de permiso,
      // no porque el balde ya está lleno (con +1 kg fallaba por el check de rango).
      p_kg: -0.01,
      p_venta_item_id: null,
    });
    expect(error?.code).toBe("42501");
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

    await limpiarVenta(ventaId as number);
  });

  it("la misma clave de cobro no registra dos ventas, ni una después de otra ni a la vez", async () => {
    const pedido = (clave: string) =>
      colaborador.cliente.rpc("registrar_venta", {
        p_items: [{ formato_id: formatoId, sabor_ids: [saborId] }],
        p_medio_pago: "efectivo",
        p_clave: clave,
      });

    const kgAntes = await kgDe(baldeId);
    const claveEnSerie = crypto.randomUUID();
    const primera = await pedido(claveEnSerie);
    const segunda = await pedido(claveEnSerie);
    expect(primera.error).toBeNull();
    expect(segunda.data).toBe(primera.data);

    // El doble clic de verdad: los dos pedidos viajan juntos y chocan contra el índice.
    const claveEnParalelo = crypto.randomUUID();
    const [a, b] = await Promise.all([pedido(claveEnParalelo), pedido(claveEnParalelo)]);
    expect(a.error).toBeNull();
    expect(b.error).toBeNull();
    expect(b.data).toBe(a.data);

    // Una venta por clave, y el balde bajó 2 × 250 g: no 4.
    for (const clave of [claveEnSerie, claveEnParalelo]) {
      const { data } = await servicio.from("ventas").select("id").eq("clave_idempotencia", clave);
      expect(data).toHaveLength(1);
    }

    expect(await kgDe(baldeId)).toBeCloseTo(kgAntes - 0.5);

    for (const id of [primera.data, a.data]) {
      await colaborador.cliente.rpc("anular_venta", { p_venta_id: id });
    }
    for (const id of [primera.data, a.data]) await limpiarVenta(id as number);
  });

  it("una clave de cobro de otra persona no devuelve su venta", async () => {
    const otro = await crearUsuarioDePrueba("colaborador");
    const clave = crypto.randomUUID();

    const { data: ventaId } = await colaborador.cliente.rpc("registrar_venta", {
      p_items: [{ formato_id: formatoId, sabor_ids: [saborId] }],
      p_medio_pago: "efectivo",
      p_clave: clave,
    });
    const { error } = await otro.cliente.rpc("registrar_venta", {
      p_items: [{ formato_id: formatoId, sabor_ids: [saborId] }],
      p_medio_pago: "efectivo",
      p_clave: clave,
    });
    expect(error).not.toBeNull();

    await colaborador.cliente.rpc("anular_venta", { p_venta_id: ventaId });
    await limpiarVenta(ventaId as number);
    await servicio.auth.admin.deleteUser(otro.id);
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
