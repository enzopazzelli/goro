// @vitest-environment node
// Sin jsdom: ahí los clientes de Supabase comparten localStorage y el cliente de servicio
// termina actuando con la sesión de un usuario de prueba, sujeto a RLS.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  codigoDePrueba,
  crearUsuarioDePrueba,
  kgDe,
  limpiarVenta,
  limpiarVentasDe,
  servicio,
  stockDe,
} from "../utilesRls";

describe("Ventas: productos por unidad y conos", () => {
  let colaborador: Awaited<ReturnType<typeof crearUsuarioDePrueba>>;
  let saborId: number;
  let baldeId: number;
  let formatoId: number;
  let conoId: number;
  let bombonId: number;
  let docenaId: number;

  beforeAll(async () => {
    colaborador = await crearUsuarioDePrueba("colaborador");

    const { data: sabor } = await servicio
      .from("sabores")
      .insert({ nombre: `Sabor de producto ${Date.now()}` })
      .select("id")
      .single();
    saborId = sabor!.id;

    const { data: balde } = await servicio
      .from("baldes")
      .insert({
        codigo: `GB${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`,
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

    const { data: bombon } = await servicio
      .from("insumos")
      .insert({
        nombre: `Bombón ${Date.now()}`,
        codigo: codigoDePrueba(),
        unidad: "u",
        cantidad: 20,
        minimo: 0,
        costo: 0,
      })
      .select("id")
      .single();
    bombonId = bombon!.id;

    const { data: docena } = await servicio
      .from("presentaciones_insumo")
      .insert({ insumo_id: bombonId, nombre: "Docena", unidades: 12, precio: 5000, activo: true })
      .select("id")
      .single();
    docenaId = docena!.id;

    const { data: formato } = await servicio
      .from("formatos")
      .insert({
        nombre: `Formato con cono ${Date.now()}`,
        gramos: 130,
        cantidad_sabores: 1,
        precio: 3000,
      })
      .select("id")
      .single();
    formatoId = formato!.id;

    // El envase del formato (su cono): stock propio que baja 1 por cada venta.
    const { data: cono } = await servicio
      .from("insumos")
      .insert({
        nombre: `Cono ${Date.now()}`,
        codigo: codigoDePrueba(),
        unidad: "u",
        tipo: "envase",
        formato_id: formatoId,
        cantidad: 5,
        minimo: 0,
        costo: 0,
      })
      .select("id")
      .single();
    conoId = cono!.id;
  });

  afterAll(async () => {
    await limpiarVentasDe("presentacion_id", [docenaId]);
    await limpiarVentasDe("formato_id", [formatoId]);
    await servicio.from("movimientos_insumo").delete().in("insumo_id", [conoId, bombonId]);
    await servicio.from("movimientos_balde").delete().eq("balde_id", baldeId);
    await servicio.from("presentaciones_insumo").delete().eq("insumo_id", bombonId);
    await servicio.from("insumos").delete().in("id", [conoId, bombonId]);
    await servicio.from("formatos").delete().eq("id", formatoId);
    await servicio.from("baldes").delete().eq("id", baldeId);
    await servicio.from("sabores").delete().eq("id", saborId);
    await servicio.auth.admin.deleteUser(colaborador.id);
  });

  it("vender un formato baja el helado y su cono; anular devuelve los dos, una sola vez", async () => {
    const { data: ventaId, error } = await colaborador.cliente.rpc("registrar_venta", {
      p_items: [{ formato_id: formatoId, sabor_ids: [saborId] }],
      p_medio_pago: "efectivo",
    });
    expect(error).toBeNull();
    expect(await stockDe(conoId)).toBe(4);
    expect(await kgDe(baldeId)).toBeCloseTo(9.87);

    await colaborador.cliente.rpc("anular_venta", { p_venta_id: ventaId });
    expect(await stockDe(conoId)).toBe(5);
    expect(await kgDe(baldeId)).toBeCloseTo(10);

    // Review Focus 2: anular otra vez da error y no devuelve nada de más.
    const { error: errorRepetido } = await colaborador.cliente.rpc("anular_venta", {
      p_venta_id: ventaId,
    });
    expect(errorRepetido?.message).toMatch(/ya está anulada/);
    expect(await stockDe(conoId)).toBe(5);

    await limpiarVenta(ventaId as number);
  });

  it("vender una docena baja 12, congela el precio y anular devuelve las 12", async () => {
    const { data: ventaId, error } = await colaborador.cliente.rpc("registrar_venta", {
      p_items: [{ presentacion_id: docenaId }],
      p_medio_pago: "efectivo",
    });
    expect(error).toBeNull();
    expect(await stockDe(bombonId)).toBe(8);

    await servicio.from("presentaciones_insumo").update({ precio: 6000 }).eq("id", docenaId);
    const { data: item } = await servicio
      .from("venta_items")
      .select("precio")
      .eq("venta_id", ventaId)
      .single();
    expect(item!.precio).toBe(5000);
    await servicio.from("presentaciones_insumo").update({ precio: 5000 }).eq("id", docenaId);

    await colaborador.cliente.rpc("anular_venta", { p_venta_id: ventaId });
    expect(await stockDe(bombonId)).toBe(20);
    await limpiarVenta(ventaId as number);
  });

  it("una presentación que ya se vendió no se puede borrar: se desactiva", async () => {
    const { data: ventaId } = await colaborador.cliente.rpc("registrar_venta", {
      p_items: [{ presentacion_id: docenaId }],
      p_medio_pago: "efectivo",
    });

    // La foreign key de venta_items la protege aunque la venta después se anule.
    const { error } = await servicio.from("presentaciones_insumo").delete().eq("id", docenaId);
    expect(error?.code).toBe("23503");

    await colaborador.cliente.rpc("anular_venta", { p_venta_id: ventaId });
    const { error: trasAnular } = await servicio
      .from("presentaciones_insumo")
      .delete()
      .eq("id", docenaId);
    expect(trasAnular?.code).toBe("23503");

    await limpiarVenta(ventaId as number);
  });

  it("sin stock la venta pasa y el insumo queda negativo", async () => {
    const { data: ventaId, error } = await colaborador.cliente.rpc("registrar_venta", {
      p_items: [{ presentacion_id: docenaId }, { presentacion_id: docenaId }],
      p_medio_pago: "efectivo",
    });
    expect(error).toBeNull();
    expect(await stockDe(bombonId)).toBe(-4);

    await colaborador.cliente.rpc("anular_venta", { p_venta_id: ventaId });
    expect(await stockDe(bombonId)).toBe(20);
    await limpiarVenta(ventaId as number);
  });

  it("un item tiene que ser formato o producto, nunca los dos ni ninguno", async () => {
    for (const item of [
      { formato_id: formatoId, sabor_ids: [saborId], presentacion_id: docenaId },
      {},
    ]) {
      const { error } = await colaborador.cliente.rpc("registrar_venta", {
        p_items: [item],
        p_medio_pago: "efectivo",
      });
      expect(error?.message).toMatch(/formato o un producto/);
    }
  });

  it("una presentación inexistente da error y no deja ninguna venta a medias", async () => {
    const { count: antes } = await servicio
      .from("ventas")
      .select("id", { count: "exact", head: true });
    const { error } = await colaborador.cliente.rpc("registrar_venta", {
      p_items: [{ presentacion_id: 999999999 }],
      p_medio_pago: "efectivo",
    });
    expect(error?.message).toMatch(/inválido o inactivo/);
    const { count: despues } = await servicio
      .from("ventas")
      .select("id", { count: "exact", head: true });
    expect(despues).toBe(antes);
  });

  it("una presentación inactiva no se puede vender", async () => {
    await servicio.from("presentaciones_insumo").update({ activo: false }).eq("id", docenaId);
    const { error } = await colaborador.cliente.rpc("registrar_venta", {
      p_items: [{ presentacion_id: docenaId }],
      p_medio_pago: "efectivo",
    });
    expect(error?.message).toMatch(/inválido o inactivo/);
    await servicio.from("presentaciones_insumo").update({ activo: true }).eq("id", docenaId);
  });

  it("un cono desactivado no frena la venta del formato", async () => {
    await servicio.from("insumos").update({ activo: false }).eq("id", conoId);
    const { data: ventaId, error } = await colaborador.cliente.rpc("registrar_venta", {
      p_items: [{ formato_id: formatoId, sabor_ids: [saborId] }],
      p_medio_pago: "efectivo",
    });
    expect(error).toBeNull();
    expect(await stockDe(conoId)).toBe(4);

    await colaborador.cliente.rpc("anular_venta", { p_venta_id: ventaId });
    await servicio.from("insumos").update({ activo: true }).eq("id", conoId);
    await limpiarVenta(ventaId as number);
  });

  it("las funciones internas no se pueden llamar por RPC directo", async () => {
    const { error: errorMovimiento } = await colaborador.cliente.rpc("aplicar_movimiento_insumo", {
      p_insumo_id: bombonId,
      p_tipo: "ajuste",
      p_cantidad: 1,
      p_venta_item_id: null,
    });
    expect(errorMovimiento).not.toBeNull();

    const { error: errorCobro } = await colaborador.cliente.rpc("cobrar_item_presentacion", {
      p_venta_id: 1,
      p_item: { presentacion_id: docenaId },
    });
    expect(errorCobro).not.toBeNull();
  });

  it("la base rechaza un item con formato y presentación a la vez, o con ninguno", async () => {
    const { data: venta } = await servicio
      .from("ventas")
      .insert({ medio_pago: "efectivo", total: 0, creado_por: colaborador.id })
      .select("id")
      .single();

    const { error: ninguno } = await servicio
      .from("venta_items")
      .insert({ venta_id: venta!.id, precio: 0 });
    expect(ninguno?.code).toBe("23514");

    const { error: ambos } = await servicio
      .from("venta_items")
      .insert({ venta_id: venta!.id, formato_id: formatoId, presentacion_id: docenaId, precio: 0 });
    expect(ambos?.code).toBe("23514");

    await servicio.from("ventas").delete().eq("id", venta!.id);
  });

  it("registrar_movimiento_insumo no acepta los tipos que son solo de venta", async () => {
    for (const tipo of ["venta", "anulacion"]) {
      const { error } = await colaborador.cliente.rpc("registrar_movimiento_insumo", {
        p_insumo_id: bombonId,
        p_tipo: tipo,
        p_cantidad: 1,
        p_motivo: "movimiento falso",
      });
      expect(error?.message).toMatch(/tipo de movimiento/i);
    }
    expect(await stockDe(bombonId)).toBe(20);
  });
});
