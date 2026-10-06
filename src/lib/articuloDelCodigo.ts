import "server-only";
import { leerCodigo } from "@/lib/codigos/codigo";
import type { clienteServidor } from "@/lib/supabase/servidor";

type Cliente = Awaited<ReturnType<typeof clienteServidor>>;

/** Lo que dice un código escaneado: un artículo, otra cosa del sistema, o nada que sirva. */
export type CodigoLeido = { articuloId: number } | { otro: "balde" | "pote" } | { error: string };

/**
 * Recibir mercadería y descartar leen el mismo código de artículo con
 * `resolver_codigo`. Lo que cambia es qué le dicen a quien escaneó un balde o
 * un pote: eso lo decide cada pantalla.
 */
export async function articuloDelCodigo(supabase: Cliente, codigo: string): Promise<CodigoLeido> {
  if (!leerCodigo(codigo)) return { error: "Ese código no es de este sistema. ¿Lo tipeaste bien?" };

  const { data } = await supabase.rpc("resolver_codigo", { p_texto: codigo });
  const encontrado = (data as { tipo: string; id: number }[] | null)?.[0];
  if (!encontrado) return { error: "Ese código no está cargado." };
  if (encontrado.tipo === "articulo") return { articuloId: encontrado.id };
  if (encontrado.tipo === "balde" || encontrado.tipo === "pote") return { otro: encontrado.tipo };

  return { error: "Ese código no es de mercadería." };
}
