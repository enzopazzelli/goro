"use server";

import { revalidatePath } from "next/cache";
import { clienteServidor } from "@/lib/supabase/servidor";
import { leerKgTirado } from "../kgTirado";
import type { EstadoFormulario } from "./acciones";

const SIN_ERROR: EstadoFormulario = { error: null };

/**
 * Se terminó el balde abierto, y quien lo vació dice cuánto se tiró. Lo tirado
 * queda como descarte; la diferencia con lo que el sistema creía que quedaba,
 * como ajuste de la estimación (lo hace la base, en la misma transacción). El
 * balde pasa a esperar el canje.
 */
export async function vaciarBalde(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const baldeId = Number(datos.get("baldeId"));
  if (!Number.isInteger(baldeId) || baldeId <= 0) return { error: "Balde inválido." };
  const tirado = leerKgTirado(datos.get("kgTirado"));
  if ("error" in tirado) return { error: tirado.error };

  const supabase = await clienteServidor();
  const { error } = await supabase.rpc("vaciar_balde", {
    p_balde_id: baldeId,
    p_kg_tirado: tirado.kg,
  });
  // Los mensajes de la función ya están escritos para mostrarse tal cual.
  if (error) return { error: error.message };

  revalidatePath("/inventario");
  revalidatePath("/ventas");
  revalidatePath("/descarte");
  return SIN_ERROR;
}

/** Se entregaron vacíos al proveedor. Todo o nada: ver `canjear_baldes`. */
export async function canjearBaldes(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const ids = datos.getAll("baldeId").map(Number);
  if (ids.length === 0) return { error: "Elegí al menos un balde." };
  if (ids.some((id) => !Number.isInteger(id) || id <= 0)) return { error: "Balde inválido." };

  const supabase = await clienteServidor();
  const { error } = await supabase.rpc("canjear_baldes", { p_ids: ids });
  if (error) return { error: error.message };

  revalidatePath("/inventario");
  return SIN_ERROR;
}
