"use server";

import { revalidatePath } from "next/cache";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { EstadoFormulario } from "./acciones";

const SIN_ERROR: EstadoFormulario = { error: null };
const COLOR_HEX = /^#[0-9a-fA-F]{6}$/;

/** RLS es la barrera real (solo dueño); acá solo se arma un mensaje si falla. */
export async function crearSabor(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const nombre = String(datos.get("nombre") ?? "").trim();
  const color = String(datos.get("color") ?? "").trim();
  if (!nombre) return { error: "Escribí un nombre." };
  if (!COLOR_HEX.test(color)) return { error: "Elegí un color." };

  const supabase = await clienteServidor();
  const { error } = await supabase.from("sabores").insert({ nombre, color });

  if (error) {
    if (error.code === "23505") return { error: `Ya existe un sabor "${nombre}".` };
    return { error: "No se pudo crear el sabor." };
  }

  revalidatePath("/inventario");
  return SIN_ERROR;
}

export async function editarNombreSabor(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const saborId = Number(datos.get("saborId"));
  const nombre = String(datos.get("nombre") ?? "").trim();

  if (!Number.isInteger(saborId) || saborId <= 0) return { error: "Sabor inválido." };
  if (!nombre) return { error: "Escribí un nombre." };

  const supabase = await clienteServidor();
  const { error } = await supabase.from("sabores").update({ nombre }).eq("id", saborId);

  if (error) {
    if (error.code === "23505") return { error: `Ya existe un sabor "${nombre}".` };
    return { error: "No se pudo guardar el nombre." };
  }

  revalidatePath("/inventario");
  revalidatePath("/ventas");
  return SIN_ERROR;
}

/** `valor` vacío = volver a usar el mínimo por defecto del comercio. */
export async function editarStockMinimo(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const saborId = Number(datos.get("saborId"));
  const valor = String(datos.get("stockMinimo") ?? "").trim();

  if (valor !== "" && (!Number.isFinite(Number(valor)) || Number(valor) < 0)) {
    return { error: "El mínimo tiene que ser un número positivo, o vacío para el default." };
  }

  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("sabores")
    .update({ stock_minimo: valor === "" ? null : Number(valor) })
    .eq("id", saborId);

  if (error) return { error: "No se pudo guardar el mínimo." };

  revalidatePath("/inventario");
  return SIN_ERROR;
}

export async function editarColorSabor(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const saborId = Number(datos.get("saborId"));
  const color = String(datos.get("color") ?? "").trim();

  if (!Number.isInteger(saborId) || saborId <= 0) return { error: "Sabor inválido." };
  if (!COLOR_HEX.test(color)) return { error: "Color inválido." };

  const supabase = await clienteServidor();
  const { error } = await supabase.from("sabores").update({ color }).eq("id", saborId);

  if (error) return { error: "No se pudo guardar el color." };

  revalidatePath("/inventario");
  revalidatePath("/ventas");
  return SIN_ERROR;
}

/** No se borra un sabor, se desactiva — mismo criterio que insumos y formatos. */
export async function cambiarActivoSabor(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const saborId = Number(datos.get("saborId"));
  const activo = datos.get("activo") === "true";
  if (!Number.isInteger(saborId) || saborId <= 0) return { error: "Sabor inválido." };

  const supabase = await clienteServidor();
  const { error } = await supabase.from("sabores").update({ activo }).eq("id", saborId);

  if (error) return { error: "No se pudo cambiar el estado del sabor." };

  revalidatePath("/inventario");
  return SIN_ERROR;
}

export async function eliminarSabor(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const saborId = Number(datos.get("saborId"));
  if (!Number.isInteger(saborId) || saborId <= 0) return { error: "Sabor inválido." };

  const supabase = await clienteServidor();
  const { error } = await supabase.from("sabores").delete().eq("id", saborId);

  if (error) {
    if (error.code === "23503") {
      return { error: "No se puede borrar: ya tiene baldes cargados. Desactivalo en cambio." };
    }
    return { error: "No se pudo borrar el sabor." };
  }

  revalidatePath("/inventario");
  revalidatePath("/ventas");
  return SIN_ERROR;
}
