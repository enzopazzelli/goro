import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";

export type EstadoBalde = "cerrado" | "abierto" | "vendido" | "vacio" | "canjeado";

export type Balde = {
  id: number;
  codigo: string;
  saborId: number;
  kgInicial: number;
  kgRestante: number;
  estado: EstadoBalde;
  costo: number;
  costoEnvase: number;
};

type FilaBalde = {
  id: number;
  codigo: string;
  sabor_id: number;
  kg_inicial: string;
  kg_restante: string;
  estado: EstadoBalde;
  costo: number;
  costo_envase: number;
};

function mapearBalde(fila: FilaBalde): Balde {
  return {
    id: fila.id,
    codigo: fila.codigo,
    saborId: fila.sabor_id,
    kgInicial: Number(fila.kg_inicial),
    kgRestante: Number(fila.kg_restante),
    estado: fila.estado,
    costo: fila.costo,
    costoEnvase: fila.costo_envase,
  };
}

/** Baldes vivos en el circuito (no vendidos/canjeados): lo que importa ver a diario. */
export async function listarBaldes(): Promise<Balde[]> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("baldes")
    .select("id, codigo, sabor_id, kg_inicial, kg_restante, estado, costo, costo_envase")
    .in("estado", ["cerrado", "abierto"])
    .order("entro_en");

  return ((data as FilaBalde[] | null) ?? []).map(mapearBalde);
}
