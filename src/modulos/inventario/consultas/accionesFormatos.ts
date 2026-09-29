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

function enteroPositivo(valor: FormDataEntryValue | null): number | null {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

/** Si el formato ya consumía ese insumo, pisa la cantidad (upsert): es configuración, no stock. */
export async function agregarConsumo(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const formatoId = enteroPositivo(datos.get("formatoId"));
  const insumoId = enteroPositivo(datos.get("insumoId"));
  const cantidad = enteroPositivo(datos.get("cantidad"));
  if (formatoId === null || insumoId === null || cantidad === null) {
    return { error: "Elegí un insumo y una cantidad entera mayor a cero." };
  }

  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("formato_insumos")
    .upsert(
      { formato_id: formatoId, insumo_id: insumoId, cantidad },
      { onConflict: "formato_id,insumo_id" },
    );

  if (error) return { error: "No se pudo guardar lo que consume el formato." };

  revalidatePath("/inventario");
  return SIN_ERROR;
}

export async function quitarConsumo(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const formatoId = enteroPositivo(datos.get("formatoId"));
  const insumoId = enteroPositivo(datos.get("insumoId"));
  if (formatoId === null || insumoId === null) return { error: "Consumo inválido." };

  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("formato_insumos")
    .delete()
    .eq("formato_id", formatoId)
    .eq("insumo_id", insumoId);

  if (error) return { error: "No se pudo quitar el consumo." };

  revalidatePath("/inventario");
  return SIN_ERROR;
}
