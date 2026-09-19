"use server";

import { revalidatePath } from "next/cache";
import { clienteServidor } from "@/lib/supabase/servidor";

export type EstadoFormulario = { error: string | null };

const SIN_ERROR: EstadoFormulario = { error: null };

/** RLS es la barrera real (solo dueño); acá solo se arma un mensaje si falla. */
export async function crearSabor(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const nombre = String(datos.get("nombre") ?? "").trim();
  if (!nombre) return { error: "Escribí un nombre." };

  const supabase = await clienteServidor();
  const { error } = await supabase.from("sabores").insert({ nombre });

  if (error) {
    if (error.code === "23505") return { error: `Ya existe un sabor "${nombre}".` };
    return { error: "No se pudo crear el sabor." };
  }

  revalidatePath("/inventario");
  return SIN_ERROR;
}

/** `valor` vacío = volver a usar el mínimo por defecto del comercio. */
export async function editarStockMinimo(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const saborId = Number(datos.get("saborId"));
  const valor = String(datos.get("stockMinimo") ?? "").trim();

  if (valor !== "" && (Number.isNaN(Number(valor)) || Number(valor) < 0)) {
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
