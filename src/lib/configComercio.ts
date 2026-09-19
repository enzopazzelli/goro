import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";

/**
 * Fila única de parámetros que Goro edita sin deploy. El patrón "default del
 * comercio + override por fila" (ver sabores.stock_minimo) necesita que el
 * default viva acá y no en un `default` de columna: así cambiarlo actualiza
 * a todas las filas en null sin tocarlas una por una.
 */
export type ConfigComercio = {
  stockMinimoDefault: number;
};

export async function obtenerConfigComercio(): Promise<ConfigComercio> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("config_comercio")
    .select("stock_minimo_default")
    .single<{ stock_minimo_default: string }>();

  if (error || !data) {
    throw new Error("No se pudo leer la configuración del comercio.");
  }

  return { stockMinimoDefault: Number(data.stock_minimo_default) };
}
