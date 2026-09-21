"use server";

import { revalidatePath } from "next/cache";
import { clienteServidor } from "@/lib/supabase/servidor";

export type EstadoFormulario = { error: string | null };

const SIN_ERROR: EstadoFormulario = { error: null };

export async function abrirBalde(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const baldeId = Number(datos.get("baldeId"));
  if (!Number.isInteger(baldeId) || baldeId <= 0) return { error: "Balde inválido." };

  const supabase = await clienteServidor();
  const { error, count } = await supabase
    .from("baldes")
    .update({ estado: "abierto" }, { count: "exact" })
    .eq("id", baldeId)
    .eq("estado", "cerrado");

  if (error) {
    if (error.code === "23505") return { error: "Ya hay un balde abierto de ese sabor." };
    return { error: "No se pudo abrir el balde." };
  }
  if (!count) return { error: "Ese balde ya no está cerrado." };

  revalidatePath("/inventario");
  revalidatePath("/ventas");
  return SIN_ERROR;
}
