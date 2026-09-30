"use server";

import { revalidatePath } from "next/cache";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { EstadoFormulario } from "./acciones";

const SIN_ERROR: EstadoFormulario = { error: null };

/** Validaciones compartidas por crear y editar, separadas para no pasar el límite de complejidad del linter. */
function validarDatosFormato(
  nombre: string,
  gramos: number,
  cantidadSabores: number,
  precio: number,
): string | null {
  if (!nombre) return "Escribí un nombre.";
  if (!Number.isInteger(gramos) || gramos <= 0) {
    return "Los gramos tienen que ser un número entero mayor a cero.";
  }
  if (!Number.isInteger(cantidadSabores) || cantidadSabores < 1) {
    return "La cantidad de sabores tiene que ser al menos 1.";
  }
  if (!Number.isInteger(precio) || precio < 0)
    return "El precio tiene que ser un número entero positivo.";
  return null;
}

export async function crearFormato(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const nombre = String(datos.get("nombre") ?? "").trim();
  const gramos = Number(datos.get("gramos"));
  const cantidadSabores = Number(datos.get("cantidadSabores"));
  const precio = Number(datos.get("precio"));

  const errorValidacion = validarDatosFormato(nombre, gramos, cantidadSabores, precio);
  if (errorValidacion) return { error: errorValidacion };

  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("formatos")
    .insert({ nombre, gramos, cantidad_sabores: cantidadSabores, precio });

  if (error) {
    if (error.code === "23505") return { error: `Ya existe un formato "${nombre}".` };
    return { error: "No se pudo crear el formato." };
  }

  revalidatePath("/inventario");
  return SIN_ERROR;
}

export async function editarFormato(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const formatoId = Number(datos.get("formatoId"));
  const nombre = String(datos.get("nombre") ?? "").trim();
  const gramos = Number(datos.get("gramos"));
  const cantidadSabores = Number(datos.get("cantidadSabores"));
  const precio = Number(datos.get("precio"));
  const activo = datos.get("activo") === "on";

  const errorValidacion = validarDatosFormato(nombre, gramos, cantidadSabores, precio);
  if (errorValidacion) return { error: errorValidacion };

  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("formatos")
    .update({ nombre, gramos, cantidad_sabores: cantidadSabores, precio, activo })
    .eq("id", formatoId);

  if (error) {
    if (error.code === "23505") return { error: `Ya existe un formato "${nombre}".` };
    return { error: "No se pudo guardar el formato." };
  }

  revalidatePath("/inventario");
  return SIN_ERROR;
}

export async function eliminarFormato(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const formatoId = Number(datos.get("formatoId"));
  if (!Number.isInteger(formatoId) || formatoId <= 0) return { error: "Formato inválido." };

  const supabase = await clienteServidor();
  const { error } = await supabase.from("formatos").delete().eq("id", formatoId);

  if (error) return { error: "No se pudo borrar el formato. ¿Tiene ventas asociadas?" };

  revalidatePath("/inventario");
  return SIN_ERROR;
}
