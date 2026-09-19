import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { Sabor } from "../tipos";

type FilaSabor = {
  id: number;
  nombre: string;
  activo: boolean;
  stock_minimo: string | null;
};

function mapearSabor(fila: FilaSabor): Sabor {
  return {
    id: fila.id,
    nombre: fila.nombre,
    activo: fila.activo,
    stockMinimo: fila.stock_minimo === null ? null : Number(fila.stock_minimo),
  };
}

/** Todos los sabores. RLS ya limita esto a cualquier sesión activa. */
export async function listarSabores(): Promise<Sabor[]> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("sabores")
    .select("id, nombre, activo, stock_minimo")
    .order("activo", { ascending: false })
    .order("nombre");

  return ((data as FilaSabor[] | null) ?? []).map(mapearSabor);
}
