// @vitest-environment node
// Sin jsdom: ahí los clientes de Supabase comparten localStorage y el cliente de servicio
// termina actuando con la sesión de un usuario de prueba, sujeto a RLS.

import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  abrirCajaDePrueba,
  borrarTurnoDePrueba,
  clavePublica,
  codigoDePrueba,
  crearUsuarioDePrueba,
  limpiarVenta,
  limpiarVentasDe,
  servicio,
  url,
} from "@/modulos/ventas/utilesRls";

const codigoDeBalde = () => `GB${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;

/**
 * Lo que NO puede hacer un colaborador al que el dueño le sacó un permiso. La
 * pantalla esconde los botones, pero la barrera es esta: quien llama la API a
 * mano, o tiene una pantalla vieja abierta, tiene que chocar contra la base.
 */
describe("Permisos por acción", () => {
  let colaborador: Awaited<ReturnType<typeof crearUsuarioDePrueba>>;
  let duenio: Awaited<ReturnType<typeof crearUsuarioDePrueba>>;
  let turnoDePrueba: number | null;
  let saborId: number;
  let baldeId: number;
  let formatoId: number;
  let insumoId: number;

  const darPermisos = (permisos: string[]) =>
    servicio.from("perfiles").update({ permisos }).eq("id", colaborador.id);

  async function venderConTarjeta() {
    const { data: ventaId, error } = await colaborador.cliente.rpc("registrar_venta", {
      p_items: [{ formato_id: formatoId, sabor_ids: [saborId] }],
      p_medio_pago: "tarjeta",
    });
    expect(error).toBeNull();
    return ventaId as number;
  }

  beforeAll(async () => {
    colaborador = await crearUsuarioDePrueba("colaborador");
    duenio = await crearUsuarioDePrueba("duenio");
    turnoDePrueba = await abrirCajaDePrueba(colaborador.cliente);

    const { data: sabor } = await servicio
      .from("sabores")
      .insert({ nombre: `Sabor de permisos ${Date.now()}` })
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
        nombre: `Formato de permisos ${Date.now()}`,
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
        nombre: `Insumo de permisos ${Date.now()}`,
        codigo: codigoDePrueba(),
        unidad: "u",
        minimo: 0,
        costo: 10,
      })
      .select("id")
      .single();
    insumoId = insumo!.id;
  });

  afterAll(async () => {
    await limpiarVentasDe("formato_id", [formatoId]);
    await servicio.from("movimientos_insumo").delete().eq("insumo_id", insumoId);
    await servicio.from("insumos").delete().eq("id", insumoId);
    await servicio.from("movimientos_balde").delete().eq("balde_id", baldeId);
    await servicio.from("baldes").delete().eq("sabor_id", saborId);
    await servicio.from("formatos").delete().eq("id", formatoId);
    await servicio.from("sabores").delete().eq("id", saborId);
    await borrarTurnoDePrueba(turnoDePrueba);
    await servicio.auth.admin.deleteUser(colaborador.id);
    await servicio.auth.admin.deleteUser(duenio.id);
  });

  it("un colaborador nuevo arranca con todos los permisos: aplicar la migración no le saca nada a nadie", async () => {
    const { data } = await servicio.from("perfiles").select("permisos").eq("id", colaborador.id);
    expect(data![0]!.permisos).toEqual(["anular_ventas", "movimientos_caja", "cargar_inventario"]);
  });

  it("tiene_permiso: el dueño siempre, el colaborador según su lista, y sin sesión nunca", async () => {
    await darPermisos([]);
    await servicio.from("perfiles").update({ permisos: [] }).eq("id", duenio.id);

    const delDuenio = await duenio.cliente.rpc("tiene_permiso", { p_permiso: "anular_ventas" });
    const delColaborador = await colaborador.cliente.rpc("tiene_permiso", {
      p_permiso: "anular_ventas",
    });
    const sinSesion = await createClient(url, clavePublica).rpc("tiene_permiso", {
      p_permiso: "anular_ventas",
    });

    expect(delDuenio.data).toBe(true);
    expect(delColaborador.data).toBe(false);
    expect(sinSesion.error?.code).toBe("42501");

    await darPermisos(["anular_ventas"]);
    const conPermiso = await colaborador.cliente.rpc("tiene_permiso", {
      p_permiso: "anular_ventas",
    });
    expect(conPermiso.data).toBe(true);
  });

  it("un permiso que no existe no entra a la lista", async () => {
    const { error } = await servicio
      .from("perfiles")
      .update({ permisos: ["borrar_todo"] })
      .eq("id", colaborador.id);
    expect(error).not.toBeNull();
  });

  it("un colaborador no se da permisos a sí mismo", async () => {
    await darPermisos([]);

    await colaborador.cliente
      .from("perfiles")
      .update({ permisos: ["anular_ventas", "movimientos_caja", "cargar_inventario"] })
      .eq("id", colaborador.id);

    const { data } = await servicio.from("perfiles").select("permisos").eq("id", colaborador.id);
    expect(data![0]!.permisos).toEqual([]);
  });

  it("el dueño le saca y le devuelve un permiso desde su propia sesión", async () => {
    const { error } = await duenio.cliente
      .from("perfiles")
      .update({ permisos: ["movimientos_caja"] })
      .eq("id", colaborador.id);
    expect(error).toBeNull();

    const { data } = await servicio.from("perfiles").select("permisos").eq("id", colaborador.id);
    expect(data![0]!.permisos).toEqual(["movimientos_caja"]);
  });

  it("sin anular_ventas no se anula ni se corrige una venta, y con el permiso sí", async () => {
    await darPermisos(["anular_ventas"]);
    const ventaId = await venderConTarjeta();
    const { data: items } = await servicio.from("venta_items").select("id").eq("venta_id", ventaId);

    await darPermisos(["movimientos_caja", "cargar_inventario"]);
    const anular = await colaborador.cliente.rpc("anular_venta", { p_venta_id: ventaId });
    const corregir = await colaborador.cliente.rpc("corregir_sabor_venta_item", {
      p_venta_item_id: items![0]!.id,
      p_sabor_viejo_id: saborId,
      p_sabor_nuevo_id: saborId + 1,
    });
    expect(anular.error?.message).toContain("No tenés permiso");
    expect(corregir.error?.message).toContain("No tenés permiso");

    const { data: venta } = await servicio
      .from("ventas")
      .select("estado")
      .eq("id", ventaId)
      .single();
    expect(venta!.estado).toBe("cobrada");

    await darPermisos(["anular_ventas"]);
    const conPermiso = await colaborador.cliente.rpc("anular_venta", { p_venta_id: ventaId });
    expect(conPermiso.error).toBeNull();

    await limpiarVenta(ventaId);
  });

  it("sin movimientos_caja no se registra ni se anula un gasto, y con el permiso sí", async () => {
    await darPermisos(["movimientos_caja"]);
    const { error: errorAlta } = await colaborador.cliente.rpc("registrar_movimiento_caja", {
      p_tipo: "gasto",
      p_monto: 100,
      p_detalle: "Servilletas",
    });
    expect(errorAlta).toBeNull();

    const { data: movimientos } = await servicio
      .from("movimientos_caja")
      .select("id")
      .eq("tipo", "gasto")
      .eq("detalle", "Servilletas")
      .order("id", { ascending: false })
      .limit(1);
    const movimientoId = movimientos![0]!.id;

    await darPermisos(["anular_ventas", "cargar_inventario"]);
    const registrar = await colaborador.cliente.rpc("registrar_movimiento_caja", {
      p_tipo: "gasto",
      p_monto: 100,
      p_detalle: "Otro gasto",
    });
    const anular = await colaborador.cliente.rpc("anular_movimiento_caja", {
      p_movimiento_id: movimientoId,
    });
    expect(registrar.error?.message).toContain("No tenés permiso");
    expect(anular.error?.message).toContain("No tenés permiso");

    await darPermisos(["movimientos_caja"]);
    const conPermiso = await colaborador.cliente.rpc("anular_movimiento_caja", {
      p_movimiento_id: movimientoId,
    });
    expect(conPermiso.error).toBeNull();
  });

  it("sin cargar_inventario no se da de alta un balde ni se ajusta stock, y con el permiso sí", async () => {
    await darPermisos(["anular_ventas", "movimientos_caja"]);

    const alta = await colaborador.cliente.from("baldes").insert({
      codigo: codigoDeBalde(),
      sabor_id: saborId,
      kg_inicial: 10,
      kg_restante: 10,
      costo: 1000,
      costo_envase: 500,
    });
    const ajusteBalde = await colaborador.cliente.rpc("registrar_ajuste_balde", {
      p_balde_id: baldeId,
      p_kg: -0.1,
    });
    const ajusteInsumo = await colaborador.cliente.rpc("registrar_movimiento_insumo", {
      p_insumo_id: insumoId,
      p_tipo: "entrada",
      p_cantidad: 5,
      p_motivo: "Prueba",
    });

    expect(alta.error?.code).toBe("42501");
    expect(ajusteBalde.error?.message).toContain("No tenés permiso");
    expect(ajusteInsumo.error?.message).toContain("No tenés permiso");

    await darPermisos(["cargar_inventario"]);
    const conPermiso = await colaborador.cliente.rpc("registrar_movimiento_insumo", {
      p_insumo_id: insumoId,
      p_tipo: "entrada",
      p_cantidad: 5,
      p_motivo: "Prueba",
    });
    expect(conPermiso.error).toBeNull();
  });

  it("sin ningún permiso extra, el colaborador igual puede vender", async () => {
    await darPermisos([]);
    const ventaId = await venderConTarjeta();

    // Anularla la hace el dueño: no depende del permiso del colaborador.
    const { error } = await duenio.cliente.rpc("anular_venta", { p_venta_id: ventaId });
    expect(error).toBeNull();

    await limpiarVenta(ventaId);
  });
});
