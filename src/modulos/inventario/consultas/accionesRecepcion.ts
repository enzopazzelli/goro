"use server";

import { revalidatePath } from "next/cache";
import { articuloDelCodigo } from "@/lib/articuloDelCodigo";
import { esFaltaDePermiso } from "@/lib/errores";
import { clienteServidor } from "@/lib/supabase/servidor";

export type EstadoRecepcion = { error: string | null; aviso?: string };

const SOLO_ARTICULOS = {
  balde: 'Ese es el código de un balde: los baldes se cargan en "Balde nuevo".',
  pote: "Ese es el código de un pote armado, no de mercadería.",
} as const;

/**
 * Entró mercadería: se escanea (o se tipea) el código del insumo y se dice
 * cuántos llegaron. Evita buscar el artículo en una lista de cuarenta con las
 * manos ocupadas. Es una entrada común del ledger, con el motivo anotado.
 */
export async function recibirPorCodigo(
  _previo: EstadoRecepcion,
  datos: FormData,
): Promise<EstadoRecepcion> {
  const cantidad = Number(datos.get("cantidad"));
  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    return { error: "La cantidad tiene que ser mayor a cero." };
  }

  const supabase = await clienteServidor();
  const leido = await articuloDelCodigo(supabase, String(datos.get("codigo") ?? "").trim());
  if ("error" in leido) return { error: leido.error };
  if ("otro" in leido) return { error: SOLO_ARTICULOS[leido.otro] };

  const { error } = await supabase.rpc("registrar_movimiento_insumo", {
    p_insumo_id: leido.articuloId,
    p_tipo: "entrada",
    p_cantidad: cantidad,
    p_motivo: "Recepción por código",
  });
  if (error) {
    return { error: esFaltaDePermiso(error) ? error.message : "No se pudo registrar la entrada." };
  }

  const { data: insumo } = await supabase
    .from("insumos")
    .select("nombre, cantidad")
    .eq("id", leido.articuloId)
    .single();

  revalidatePath("/inventario");
  return {
    error: null,
    aviso: `Entraron ${cantidad} de ${insumo?.nombre ?? "el artículo"}. Ahora hay ${Number(insumo?.cantidad ?? 0)}.`,
  };
}
