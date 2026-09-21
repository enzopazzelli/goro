"use server";

import { revalidatePath } from "next/cache";
import { clienteServidor } from "@/lib/supabase/servidor";

export type EstadoFormulario = { error: string | null };

const SIN_ERROR: EstadoFormulario = { error: null };

/** A diferencia de un override por sabor, acá no se admite vacío: esto ES el default. */
export async function editarStockMinimoDefault(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const valor = Number(datos.get("stockMinimoDefault"));
  if (!Number.isFinite(valor) || valor < 0) {
    return { error: "El mínimo tiene que ser un número positivo." };
  }

  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("config_comercio")
    .update({ stock_minimo_default: valor })
    .eq("id", true);

  if (error) return { error: "No se pudo guardar el mínimo por defecto." };

  revalidatePath("/inventario");
  return SIN_ERROR;
}
