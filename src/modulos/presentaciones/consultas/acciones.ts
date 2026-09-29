"use server";

import { revalidatePath } from "next/cache";
import { clienteServidor } from "@/lib/supabase/servidor";
import { validarPresentacion, type DatosPresentacion } from "../validacion";

export type EstadoFormulario = { error: string | null };

const SIN_ERROR: EstadoFormulario = { error: null };

function leerDatos(datos: FormData): DatosPresentacion {
  return {
    nombre: String(datos.get("nombre") ?? "").trim(),
    unidades: Number(datos.get("unidades")),
    precio: Number(datos.get("precio")),
    activo: datos.get("activo") === "on",
  };
}

/** 23505 = ya existe una presentación de ese tamaño para el insumo (índice único). */
function mensajeDeError(codigo: string | undefined, porDefecto: string): string {
  return codigo === "23505"
    ? "Ya existe una presentación con esa cantidad de unidades."
    : porDefecto;
}

export async function crearPresentacion(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const insumoId = Number(datos.get("insumoId"));
  const presentacion = { ...leerDatos(datos), activo: false };

  if (!Number.isInteger(insumoId) || insumoId <= 0) return { error: "Insumo inválido." };
  const errorValidacion = validarPresentacion(presentacion);
  if (errorValidacion) return { error: errorValidacion };

  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("presentaciones_insumo")
    .insert({ insumo_id: insumoId, ...presentacion });

  if (error) return { error: mensajeDeError(error.code, "No se pudo crear la presentación.") };

  revalidatePath("/inventario");
  return SIN_ERROR;
}

export async function editarPresentacion(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const presentacionId = Number(datos.get("presentacionId"));
  const presentacion = leerDatos(datos);

  if (!Number.isInteger(presentacionId) || presentacionId <= 0) {
    return { error: "Presentación inválida." };
  }
  const errorValidacion = validarPresentacion(presentacion);
  if (errorValidacion) return { error: errorValidacion };

  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("presentaciones_insumo")
    .update(presentacion)
    .eq("id", presentacionId);

  if (error) return { error: mensajeDeError(error.code, "No se pudo guardar la presentación.") };

  revalidatePath("/inventario");
  return SIN_ERROR;
}
