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

/** Código GA + 7 dígitos al azar: los archivos de test corren en paralelo. */
function codigoDePrueba() {
  return `GA${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
}

async function stockDe(insumoId: number) {
  const { data } = await servicio.from("insumos").select("cantidad").eq("id", insumoId).single();
  return Number(data!.cantidad);
}

async function kgDe(baldeId: number) {
  const { data } = await servicio.from("baldes").select("kg_restante").eq("id", baldeId).single();
  return Number(data!.kg_restante);
}

/** Saca una venta de prueba con todo lo que la referencia, en el orden que piden las foreign keys. */
async function limpiarVenta(ventaId: number) {
  const { data: items } = await servicio.from("venta_items").select("id").eq("venta_id", ventaId);
  const ids = (items ?? []).map((item) => item.id);
  await servicio.from("movimientos_insumo").delete().in("venta_item_id", ids);
  await servicio.from("movimientos_balde").delete().in("venta_item_id", ids);
  await servicio.from("venta_items").delete().eq("venta_id", ventaId);
  await servicio.from("ventas").delete().eq("id", ventaId);
}

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

    const { data: cono } = await servicio
      .from("insumos")
      .insert({
        nombre: `Cono ${Date.now()}`,
        codigo: codigoDePrueba(),
        unidad: "u",
        cantidad: 5,
        minimo: 0,
        costo: 0,
      })
      .select("id")
      .single();
    conoId = cono!.id;

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
    await servicio
      .from("formato_insumos")
      .insert({ formato_id: formatoId, insumo_id: conoId, cantidad: 1 });
  });

  afterAll(async () => {
    await servicio.from("movimientos_insumo").delete().in("insumo_id", [conoId, bombonId]);
    await servicio.from("movimientos_balde").delete().eq("balde_id", baldeId);
    await servicio.from("presentaciones_insumo").delete().eq("insumo_id", bombonId);
    await servicio.from("formatos").delete().eq("id", formatoId);
    await servicio.from("insumos").delete().in("id", [conoId, bombonId]);
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
});
