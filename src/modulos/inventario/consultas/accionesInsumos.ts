"use server";

import { revalidatePath } from "next/cache";
import { generarCodigo } from "@/lib/codigos/codigo";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { EstadoFormulario } from "./acciones";

const SIN_ERROR: EstadoFormulario = { error: null };

/** Validaciones compartidas por crear y editar, separadas para no pasar el límite de complejidad del linter. */
function validarDatosInsumo(
  nombre: string,
  unidad: string,
  minimo: number,
  costo: number,
): string | null {
  if (!nombre) return "Escribí un nombre.";
  if (unidad !== "u" && unidad !== "kg") return "Elegí una unidad.";
  if (!Number.isFinite(minimo) || minimo < 0) return "El mínimo tiene que ser un número positivo.";
  if (!Number.isInteger(costo) || costo < 0) {
    return "El costo tiene que ser un número entero positivo.";
  }
  return null;
}

export async function crearInsumo(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const nombre = String(datos.get("nombre") ?? "").trim();
  const unidad = String(datos.get("unidad") ?? "");
  const minimo = Number(datos.get("minimo"));
  const costo = Number(datos.get("costo"));

  const errorValidacion = validarDatosInsumo(nombre, unidad, minimo, costo);
  if (errorValidacion) return { error: errorValidacion };

  const supabase = await clienteServidor();
  const { data: numero, error: errorSecuencia } = await supabase.rpc("siguiente_numero_insumo");
  if (errorSecuencia || numero === null) return { error: "No se pudo generar el código." };

  const codigo = generarCodigo("A", numero);
  const { error } = await supabase
    .from("insumos")
    .insert({ nombre, codigo, unidad, minimo, costo });

  if (error) return { error: "No se pudo crear el insumo." };

  revalidatePath("/inventario");
  return SIN_ERROR;
}

export async function editarInsumo(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const insumoId = Number(datos.get("insumoId"));
  const nombre = String(datos.get("nombre") ?? "").trim();
  const unidad = String(datos.get("unidad") ?? "");
  const minimo = Number(datos.get("minimo"));
  const costo = Number(datos.get("costo"));

  if (!Number.isInteger(insumoId) || insumoId <= 0) return { error: "Insumo inválido." };
  const errorValidacion = validarDatosInsumo(nombre, unidad, minimo, costo);
  if (errorValidacion) return { error: errorValidacion };

  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("insumos")
    .update({ nombre, unidad, minimo, costo })
    .eq("id", insumoId);

  if (error) return { error: "No se pudo guardar el insumo." };

  revalidatePath("/inventario");
  return SIN_ERROR;
}

export async function eliminarInsumo(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const insumoId = Number(datos.get("insumoId"));
  if (!Number.isInteger(insumoId) || insumoId <= 0) return { error: "Insumo inválido." };

  const supabase = await clienteServidor();
  const { error } = await supabase.from("insumos").delete().eq("id", insumoId);

  if (error) {
    if (error.code === "23503") {
      return { error: "No se puede borrar: ya tiene movimientos cargados." };
    }
    return { error: "No se pudo borrar el insumo." };
  }

  revalidatePath("/inventario");
  return SIN_ERROR;
}

export async function registrarMovimiento(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const insumoId = Number(datos.get("insumoId"));
  const tipo = String(datos.get("tipo") ?? "");
  const cantidadCruda = Number(datos.get("cantidad"));
  const motivo = String(datos.get("motivo") ?? "").trim() || null;

  if (tipo !== "entrada" && tipo !== "ajuste") return { error: "Elegí un tipo de movimiento." };
  if (!Number.isFinite(cantidadCruda) || cantidadCruda === 0) {
    return { error: "La cantidad no puede ser cero." };
  }

  // Una "entrada" siempre suma; el signo de un "ajuste" lo elige quien carga
  // (puede corregir para arriba o para abajo).
  const cantidad = tipo === "entrada" ? Math.abs(cantidadCruda) : cantidadCruda;

  const supabase = await clienteServidor();
  const { error } = await supabase.rpc("registrar_movimiento_insumo", {
    p_insumo_id: insumoId,
    p_tipo: tipo,
    p_cantidad: cantidad,
    p_motivo: motivo,
  });

  if (error) return { error: "No se pudo registrar el movimiento." };

  revalidatePath("/inventario");
  return SIN_ERROR;
}
