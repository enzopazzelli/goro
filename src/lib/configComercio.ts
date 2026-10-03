import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";

/**
 * Fila única de parámetros que Goro edita sin deploy. El patrón "default del
 * comercio + override por fila" (ver sabores.stock_minimo, sabores.precio_balde)
 * necesita que el default viva acá y no en un `default` de columna: así cambiarlo
 * actualiza a todas las filas en null sin tocarlas una por una.
 */
export type ConfigComercio = {
  stockMinimoDefault: number;
  /** `null` mientras no se haya puesto: sin precio no se vende un balde entero. */
  precioBaldeDefault: number | null;
};

export async function obtenerConfigComercio(): Promise<ConfigComercio> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("config_comercio")
    .select("stock_minimo_default, precio_balde_default")
    .single<{ stock_minimo_default: string; precio_balde_default: number | null }>();

  if (error || !data) {
    throw new Error("No se pudo leer la configuración del comercio.");
  }

  return {
    stockMinimoDefault: Number(data.stock_minimo_default),
    precioBaldeDefault: data.precio_balde_default,
  };
}
