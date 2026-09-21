import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { Formato } from "../tipos";

type FilaFormato = {
  id: number;
  nombre: string;
  gramos: number;
  cantidad_sabores: number;
  precio: number;
  activo: boolean;
};

function mapearFormato(fila: FilaFormato): Formato {
  return {
    id: fila.id,
    nombre: fila.nombre,
    gramos: fila.gramos,
    cantidadSabores: fila.cantidad_sabores,
    precio: fila.precio,
    activo: fila.activo,
  };
}

/** Todos los formatos, activos primero. RLS ya limita esto a cualquier sesión activa. */
export async function listarFormatos(): Promise<Formato[]> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("formatos")
    .select("id, nombre, gramos, cantidad_sabores, precio, activo")
    .order("activo", { ascending: false })
    .order("nombre");

  return ((data as FilaFormato[] | null) ?? []).map(mapearFormato);
}
