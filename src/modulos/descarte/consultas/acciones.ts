"use server";

import { revalidatePath } from "next/cache";
import { articuloDelCodigo } from "@/lib/articuloDelCodigo";
import { clienteServidor } from "@/lib/supabase/servidor";
import { leerDescarte } from "../formulario";

export type EstadoDescarte = { error: string | null; aviso?: string };

const NO_SE_DESCARTA_ACA = {
  balde:
    'Ese es el código de un balde: el resto de un balde se descarta con "Se terminó", en Inventario.',
  pote: "Ese es el código de un pote: los potes se descartan desde Potes.",
} as const;

/**
 * Se tira un producto, un insumo o un envase. Lo puede hacer cualquiera con
 * sesión: la base anota quién, congela el costo y baja el stock, todo junto.
 */
export async function descartarArticulo(
  _previo: EstadoDescarte,
  datos: FormData,
): Promise<EstadoDescarte> {
  const leido = leerDescarte(datos);
  if ("error" in leido) return { error: leido.error };

  const supabase = await clienteServidor();
  const codigo = await articuloDelCodigo(supabase, leido.codigo);
  if ("error" in codigo) return { error: codigo.error };
  if ("otro" in codigo) return { error: NO_SE_DESCARTA_ACA[codigo.otro] };
  const insumoId = codigo.articuloId;

  const { error } = await supabase.rpc("descartar_insumo", {
    p_insumo_id: insumoId,
    p_cantidad: leido.cantidad,
    p_motivo: leido.motivo,
    p_nota: leido.nota,
    p_clave: leido.clave,
  });
  // Los mensajes de la función ya están escritos para mostrarse tal cual.
  if (error) return { error: error.message };

  const { data: insumo } = await supabase
    .from("insumos")
    .select("nombre")
    .eq("id", insumoId)
    .single();

  revalidatePath("/descarte");
  revalidatePath("/inventario");
  return {
    error: null,
    aviso: `Se descartó ${leido.cantidad} de ${insumo?.nombre ?? "el artículo"}.`,
  };
}
