"use server";

import { revalidatePath } from "next/cache";
import { clienteServidor } from "@/lib/supabase/servidor";
import { validarPresentacion, validarProducto, type DatosPresentacion } from "../validacion";

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

/**
 * La función de base crea el insumo, su código y sus dos presentaciones (Unidad
 * ×1 y Docena ×12, inactivas) y el stock inicial en UNA transacción; acá solo
 * se valida y se traducen los errores.
 */
export async function crearProducto(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const cantidadCruda = String(datos.get("cantidadInicial") ?? "").trim();
  const producto = {
    nombre: String(datos.get("nombre") ?? "").trim(),
    costo: Number(datos.get("costo")),
    cantidadInicial: cantidadCruda === "" ? 0 : Number(cantidadCruda),
  };

  const errorValidacion = validarProducto(producto);
  if (errorValidacion) return { error: errorValidacion };

  const supabase = await clienteServidor();
  const { error } = await supabase.rpc("crear_producto", {
    p_nombre: producto.nombre,
    p_costo: producto.costo,
    p_cantidad_inicial: producto.cantidadInicial,
  });

  if (error) {
    if (error.code === "23505") return { error: `Ya existe algo llamado "${producto.nombre}".` };
    return { error: "No se pudo crear el producto." };
  }

  revalidatePath("/inventario");
  return SIN_ERROR;
}

/** El envase propio de un formato (su cono, canasta o vasito): stock y precio "sin helado". */
export async function crearEnvase(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const formatoId = Number(datos.get("formatoId"));
  if (!Number.isInteger(formatoId) || formatoId <= 0) return { error: "Formato inválido." };

  const supabase = await clienteServidor();
  const { error } = await supabase.rpc("crear_envase_de_formato", { p_formato_id: formatoId });

  if (error) {
    if (error.code === "23505") return { error: "Ese formato ya tiene envase." };
    return { error: "No se pudo crear el envase." };
  }

  revalidatePath("/inventario");
  return SIN_ERROR;
}

/**
 * Solo se puede borrar una presentación que nunca se vendió: si ya tiene ventas,
 * la foreign key de venta_items la protege sola, y el camino es retirarla
 * sacándole el tilde "A la venta".
 */
export async function eliminarPresentacion(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const presentacionId = Number(datos.get("presentacionId"));
  if (!Number.isInteger(presentacionId) || presentacionId <= 0) {
    return { error: "Presentación inválida." };
  }

  const supabase = await clienteServidor();
  const { error } = await supabase.from("presentaciones_insumo").delete().eq("id", presentacionId);

  if (error) {
    if (error.code === "23503") {
      return {
        error: 'Ya se vendió, no se puede borrar. Sacale el tilde "A la venta" para retirarla.',
      };
    }
    return { error: "No se pudo borrar la presentación." };
  }

  revalidatePath("/inventario");
  return SIN_ERROR;
}
