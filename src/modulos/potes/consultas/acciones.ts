"use server";

import { revalidatePath } from "next/cache";
import { clienteServidor } from "@/lib/supabase/servidor";

export type EstadoPote = { error: string | null; poteId?: number };

const SIN_ERROR: EstadoPote = { error: null };

function refrescar() {
  revalidatePath("/potes");
  revalidatePath("/ventas");
  revalidatePath("/inventario");
}

/**
 * El peso lo tipea quien lo pesó. La balanza no se conecta al sistema (pesa y
 * muestra, no imprime), así que es el único dato que viaja a mano; la base lo
 * revisa contra el formato para frenar un 2620 donde iba 262.
 */
export async function armarPote(_previo: EstadoPote, datos: FormData): Promise<EstadoPote> {
  const formatoId = Number(datos.get("formatoId"));
  const baldeId = Number(datos.get("baldeId"));
  const pesoG = Number(datos.get("pesoG"));

  if (!Number.isInteger(formatoId) || formatoId <= 0) return { error: "Elegí el formato." };
  if (!Number.isInteger(baldeId) || baldeId <= 0) return { error: "Elegí el sabor." };
  if (!Number.isInteger(pesoG) || pesoG <= 0) {
    return { error: "El peso tiene que ser un número entero de gramos." };
  }

  const supabase = await clienteServidor();
  const { data, error } = await supabase.rpc("armar_pote", {
    p_formato_id: formatoId,
    p_balde_id: baldeId,
    p_peso_g: pesoG,
  });
  // Los mensajes de la función ya están escritos para mostrarse tal cual.
  if (error) return { error: error.message };

  refrescar();
  return { error: null, poteId: Number(data) };
}

async function sobrePote(
  funcion: "anular_pote" | "descartar_pote",
  datos: FormData,
): Promise<EstadoPote> {
  const poteId = Number(datos.get("poteId"));
  if (!Number.isInteger(poteId) || poteId <= 0) return { error: "Pote inválido." };

  const supabase = await clienteServidor();
  const { error } = await supabase.rpc(funcion, { p_pote_id: poteId });
  if (error) return { error: error.message };

  refrescar();
  return SIN_ERROR;
}

/** Se armó mal: el helado vuelve al balde. */
export async function anularPote(_previo: EstadoPote, datos: FormData): Promise<EstadoPote> {
  return sobrePote("anular_pote", datos);
}

/** Se venció o se cayó: es merma, el helado no vuelve. */
export async function descartarPote(_previo: EstadoPote, datos: FormData): Promise<EstadoPote> {
  return sobrePote("descartar_pote", datos);
}
