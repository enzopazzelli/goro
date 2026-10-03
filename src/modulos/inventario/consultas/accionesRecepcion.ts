"use server";

import { revalidatePath } from "next/cache";
import { leerCodigo } from "@/lib/codigos/codigo";
import { esFaltaDePermiso } from "@/lib/errores";
import { clienteServidor } from "@/lib/supabase/servidor";

export type EstadoRecepcion = { error: string | null; aviso?: string };

type Cliente = Awaited<ReturnType<typeof clienteServidor>>;

const SOLO_ARTICULOS: Record<string, string> = {
  balde: 'Ese es el código de un balde: los baldes se cargan en "Balde nuevo".',
  pote: "Ese es el código de un pote armado, no de mercadería.",
};

/** El id del artículo que dice el código, o el motivo por el que no sirve. */
async function articuloDelCodigo(
  supabase: Cliente,
  codigo: string,
): Promise<{ id: number } | { error: string }> {
  if (!leerCodigo(codigo)) return { error: "Ese código no es de este sistema. ¿Lo tipeaste bien?" };

  const { data } = await supabase.rpc("resolver_codigo", { p_texto: codigo });
  const encontrado = (data as { tipo: string; id: number }[] | null)?.[0];
  if (!encontrado) return { error: "Ese código no está cargado." };
  if (encontrado.tipo === "articulo") return { id: encontrado.id };

  return { error: SOLO_ARTICULOS[encontrado.tipo] ?? "Ese código no es de mercadería." };
}

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
  const articulo = await articuloDelCodigo(supabase, String(datos.get("codigo") ?? "").trim());
  if ("error" in articulo) return { error: articulo.error };

  const { error } = await supabase.rpc("registrar_movimiento_insumo", {
    p_insumo_id: articulo.id,
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
    .eq("id", articulo.id)
    .single();

  revalidatePath("/inventario");
  return {
    error: null,
    aviso: `Entraron ${cantidad} de ${insumo?.nombre ?? "el artículo"}. Ahora hay ${Number(insumo?.cantidad ?? 0)}.`,
  };
}
