"use server";

import { revalidatePath } from "next/cache";
import { clienteServidor } from "@/lib/supabase/servidor";
import { TIPOS_MANUALES, type TipoManual } from "../tipos";

export type EstadoFormulario = { error: string | null };

const SIN_ERROR: EstadoFormulario = { error: null };

function montoEntero(valor: FormDataEntryValue | null): number | null {
  const monto = Number(valor);
  return Number.isInteger(monto) ? monto : null;
}

export async function registrarMovimientoCaja(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const tipo = String(datos.get("tipo") ?? "") as TipoManual;
  if (!TIPOS_MANUALES.includes(tipo)) return { error: "Tipo de movimiento inválido." };

  const monto = montoEntero(datos.get("monto"));
  if (monto === null || monto <= 0) return { error: "El monto tiene que ser mayor a cero." };

  const detalle = String(datos.get("detalle") ?? "").trim();
  if (!detalle) return { error: "Falta el detalle." };

  // El monto viaja positivo: el signo lo pone la base según el tipo.
  const supabase = await clienteServidor();
  const { error } = await supabase.rpc("registrar_movimiento_caja", {
    p_tipo: tipo,
    p_monto: monto,
    p_detalle: detalle,
  });
  if (error) return { error: error.message };

  revalidatePath("/caja");
  return SIN_ERROR;
}

export async function anularMovimientoCaja(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const movimientoId = Number(datos.get("movimientoId"));
  if (!Number.isInteger(movimientoId) || movimientoId <= 0)
    return { error: "Movimiento inválido." };

  const supabase = await clienteServidor();
  const { error } = await supabase.rpc("anular_movimiento_caja", { p_movimiento_id: movimientoId });
  if (error) return { error: error.message };

  revalidatePath("/caja");
  return SIN_ERROR;
}

/** No devuelve el arqueo: para quien cierra, es ciego. El dueño lo ve en el historial. */
export async function cerrarCaja(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const contado = montoEntero(datos.get("contado"));
  const fondo = montoEntero(datos.get("fondoQueQueda"));
  if (contado === null || contado < 0)
    return { error: "Escribí cuánto contaste, en pesos enteros." };
  if (fondo === null || fondo < 0)
    return { error: "Escribí cuánto queda de fondo, en pesos enteros." };
  if (fondo > contado) return { error: "El fondo que queda no puede ser más de lo que contaste." };

  const supabase = await clienteServidor();
  const { error } = await supabase.rpc("cerrar_caja", {
    p_contado: contado,
    p_fondo_que_queda: fondo,
  });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return SIN_ERROR;
}
