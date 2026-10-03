import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";

/**
 * Nombres para "quién lo hizo". RLS de perfiles deja al colaborador verse solo
 * a sí mismo; por eso las columnas de quién las muestra solo la vista del dueño
 * (y los Excel, que también son del dueño).
 */
export async function nombresDePerfiles(): Promise<Map<string, string>> {
  const supabase = await clienteServidor();
  const { data } = await supabase.from("perfiles").select("id, nombre");
  return new Map((data ?? []).map((fila) => [fila.id as string, fila.nombre as string]));
}
