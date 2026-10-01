"use server";

import { revalidatePath } from "next/cache";
import { clienteServidor } from "@/lib/supabase/servidor";

export type EstadoFormulario = { error: string | null };

const SIN_ERROR: EstadoFormulario = { error: null };

/** Vive en lib/ porque se abre desde Caja y desde Ventas (cuando se quiere cobrar con la caja cerrada). */
export async function abrirCaja(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const contado = Number(datos.get("contado"));
  if (!Number.isInteger(contado) || contado < 0) {
    return { error: "Escribí cuánto hay en el cajón, en pesos enteros." };
  }

  const supabase = await clienteServidor();
  const { error } = await supabase.rpc("abrir_caja", { p_contado: contado });
  if (error) return { error: error.message };

  // "layout" y no la página: la insignia de la barra lateral también cambia.
  revalidatePath("/", "layout");
  return SIN_ERROR;
}
