import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { ConsumoDeFormato } from "../tipos";

type FilaConsumo = {
  formato_id: number;
  insumo_id: number;
  cantidad: number;
  insumos: { nombre: string } | null;
};

export async function listarConsumosDeFormatos(): Promise<ConsumoDeFormato[]> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("formato_insumos")
    .select("formato_id, insumo_id, cantidad, insumos ( nombre )");

  return ((data as unknown as FilaConsumo[] | null) ?? []).map((fila) => ({
    formatoId: fila.formato_id,
    insumoId: fila.insumo_id,
    insumoNombre: fila.insumos?.nombre ?? "",
    cantidad: fila.cantidad,
  }));
}
