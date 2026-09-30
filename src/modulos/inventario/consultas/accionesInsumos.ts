"use server";

import { revalidatePath } from "next/cache";
import { generarCodigo } from "@/lib/codigos/codigo";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { EstadoFormulario } from "./acciones";

const SIN_ERROR: EstadoFormulario = { error: null };

/**
 * La RLS de alta exige cantidad = 0: el stock, aunque sea el primero, entra
 * siempre por registrar_movimiento_insumo, no por el insert. Separada de
 * crearInsumo para no pasar el límite de complejidad del linter.
 */
async function cargarCantidadInicial(
  supabase: Awaited<ReturnType<typeof clienteServidor>>,
  insumoId: number,
  cantidadInicial: number,
): Promise<string | null> {
  if (cantidadInicial <= 0) return null;

  const { error } = await supabase.rpc("registrar_movimiento_insumo", {
    p_insumo_id: insumoId,
    p_tipo: "entrada",
    p_cantidad: cantidadInicial,
    p_motivo: "Carga inicial",
  });

  if (error)
    return "El insumo se creó, pero no se pudo cargar la cantidad inicial. Registrala aparte.";
  return null;
}

/** Vacío = arrancar en cero. Separada de crearInsumo por el límite de complejidad del linter. */
function parsearCantidadInicial(datos: FormData): { valor: number; error?: string } {
  const cruda = String(datos.get("cantidadInicial") ?? "").trim();
  const valor = cruda === "" ? 0 : Number(cruda);
  if (!Number.isFinite(valor) || valor < 0) {
    return {
      valor: 0,
      error: "La cantidad inicial tiene que ser un número positivo, o vacía para arrancar en cero.",
    };
  }
  return { valor };
}

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
  const { valor: cantidadInicial, error: errorCantidad } = parsearCantidadInicial(datos);
  if (errorCantidad) return { error: errorCantidad };

  const supabase = await clienteServidor();
  const { data: numero, error: errorSecuencia } = await supabase.rpc("siguiente_numero_insumo");
  if (errorSecuencia || numero === null) return { error: "No se pudo generar el código." };

  const codigo = generarCodigo("A", numero);
  const { data: insumo, error } = await supabase
    .from("insumos")
    .insert({ nombre, codigo, unidad, minimo, costo })
    .select("id")
    .single();

  if (error || !insumo) return { error: "No se pudo crear el insumo." };

  const errorCarga = await cargarCantidadInicial(supabase, insumo.id, cantidadInicial);
  if (errorCarga) return { error: errorCarga };

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
