import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { Perfil } from "../tipos";

/**
 * Todos los perfiles. Quién ve qué no se decide acá: RLS devuelve todas las
 * filas si pide el dueño, y solo la propia si pide un colaborador. La consulta
 * es la misma en los dos casos — esa es la gracia.
 */
export async function listarPerfiles(): Promise<Perfil[]> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("perfiles")
    .select("id, usuario, nombre, rol, activo")
    .order("usuario");

  return (data as Perfil[] | null) ?? [];
}
