import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { Insumo, TipoInsumo, UnidadInsumo } from "../tipos";

type FilaInsumo = {
  id: number;
  nombre: string;
  codigo: string;
  unidad: UnidadInsumo;
  cantidad: string;
  minimo: string;
  costo: number;
  activo: boolean;
  tipo: TipoInsumo;
  formato_id: number | null;
};

function mapearInsumo(fila: FilaInsumo): Insumo {
  return {
    id: fila.id,
    nombre: fila.nombre,
    codigo: fila.codigo,
    unidad: fila.unidad,
    cantidad: Number(fila.cantidad),
    minimo: Number(fila.minimo),
    costo: fila.costo,
    activo: fila.activo,
    tipo: fila.tipo,
    formatoId: fila.formato_id,
  };
}

export async function listarInsumos(): Promise<Insumo[]> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("insumos")
    .select("id, nombre, codigo, unidad, cantidad, minimo, costo, activo, tipo, formato_id")
    .order("nombre");

  return ((data as FilaInsumo[] | null) ?? []).map(mapearInsumo);
}
