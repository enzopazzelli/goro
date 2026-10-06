"use server";

import { revalidatePath } from "next/cache";
import { clienteServidor } from "@/lib/supabase/servidor";
import { esMotivoAElegir } from "@/modulos/descarte/tipos";

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

function poteDe(datos: FormData): number | null {
  const poteId = Number(datos.get("poteId"));
  return Number.isInteger(poteId) && poteId > 0 ? poteId : null;
}

/** Se armó mal: el helado vuelve al balde. */
export async function anularPote(_previo: EstadoPote, datos: FormData): Promise<EstadoPote> {
  const poteId = poteDe(datos);
  if (poteId === null) return { error: "Pote inválido." };

  const supabase = await clienteServidor();
  const { error } = await supabase.rpc("anular_pote", { p_pote_id: poteId });
  if (error) return { error: error.message };

  refrescar();
  return SIN_ERROR;
}

/**
 * Se venció, se rompió o se derritió: es merma, el helado no vuelve. Lo puede
 * hacer cualquiera con sesión, y queda en el descarte con su motivo y su costo.
 */
export async function descartarPote(_previo: EstadoPote, datos: FormData): Promise<EstadoPote> {
  const poteId = poteDe(datos);
  if (poteId === null) return { error: "Pote inválido." };
  const motivo = datos.get("motivo");
  if (!esMotivoAElegir(motivo)) return { error: "Elegí por qué se tira." };
  const nota = String(datos.get("nota") ?? "").trim();

  const supabase = await clienteServidor();
  const { error } = await supabase.rpc("descartar_pote", {
    p_pote_id: poteId,
    p_motivo: motivo,
    p_nota: nota || null,
  });
  if (error) return { error: error.message };

  refrescar();
  revalidatePath("/descarte");
  return SIN_ERROR;
}
