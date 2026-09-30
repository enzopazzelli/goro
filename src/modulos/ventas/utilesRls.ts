import { createClient } from "@supabase/supabase-js";

/**
 * Lo que comparten los tests de base de Ventas. Corre contra un proyecto Supabase
 * de PRUEBA: crea usuarios y filas descartables con la clave de servicio.
 */

export const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const clavePublica = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const servicio = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function crearUsuarioDePrueba(rol: "duenio" | "colaborador") {
  const usuario = `t-${rol}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
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

/** Código GA + 7 dígitos al azar: los archivos de test corren en paralelo. */
export function codigoDePrueba() {
  return `GA${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
}

export async function stockDe(insumoId: number) {
  const { data } = await servicio.from("insumos").select("cantidad").eq("id", insumoId).single();
  return Number(data!.cantidad);
}

export async function kgDe(baldeId: number) {
  const { data } = await servicio.from("baldes").select("kg_restante").eq("id", baldeId).single();
  return Number(data!.kg_restante);
}

/** Saca una venta de prueba con todo lo que la referencia, en el orden que piden las foreign keys. */
export async function limpiarVenta(ventaId: number) {
  const { data: items } = await servicio.from("venta_items").select("id").eq("venta_id", ventaId);
  const ids = (items ?? []).map((item) => item.id);
  await servicio.from("movimientos_insumo").delete().in("venta_item_id", ids);
  await servicio.from("movimientos_balde").delete().in("venta_item_id", ids);
  await servicio.from("venta_items").delete().eq("venta_id", ventaId);
  await servicio.from("ventas").delete().eq("id", ventaId);
}

/**
 * Un test que falla a mitad de camino no llega a su propio limpiarVenta y deja
 * una venta que impide borrar el formato (y el balde, y el usuario). El afterAll
 * barre todas las ventas que tocaron estos formatos o presentaciones.
 */
export async function limpiarVentasDe(columna: "formato_id" | "presentacion_id", ids: number[]) {
  const { data } = await servicio.from("venta_items").select("venta_id").in(columna, ids);
  for (const venta of new Set((data ?? []).map((item) => item.venta_id))) {
    await limpiarVenta(venta);
  }
}
