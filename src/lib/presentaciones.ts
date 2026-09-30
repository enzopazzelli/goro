import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";

export type Presentacion = {
  id: number;
  insumoId: number;
  insumoNombre: string;
  insumoActivo: boolean;
  nombre: string;
  unidades: number;
  precio: number;
  activo: boolean;
};

type FilaPresentacion = {
  id: number;
  insumo_id: number;
  nombre: string;
  unidades: number;
  precio: number;
  activo: boolean;
  insumos: { nombre: string; activo: boolean } | null;
};

function mapearPresentacion(fila: FilaPresentacion): Presentacion {
  return {
    id: fila.id,
    insumoId: fila.insumo_id,
    insumoNombre: fila.insumos?.nombre ?? "",
    insumoActivo: fila.insumos?.activo ?? false,
    nombre: fila.nombre,
    unidades: fila.unidades,
    precio: fila.precio,
    activo: fila.activo,
  };
}

/** Todas las presentaciones, por insumo y de menor a mayor. RLS ya limita esto a una sesión activa. */
export async function listarPresentaciones(): Promise<Presentacion[]> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("presentaciones_insumo")
    .select("id, insumo_id, nombre, unidades, precio, activo, insumos ( nombre, activo )")
    .order("insumo_id")
    .order("unidades");

  return ((data as unknown as FilaPresentacion[] | null) ?? []).map(mapearPresentacion);
}
