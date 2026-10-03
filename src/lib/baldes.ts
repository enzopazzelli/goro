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

/** Un balde que se terminó y espera que el proveedor lo cambie por uno lleno. */
export type BaldeVacio = { id: number; codigo: string; saborNombre: string; salioEn: string };

type FilaBaldeVacio = {
  id: number;
  codigo: string;
  salio_en: string;
  sabores: { nombre: string } | null;
};

/** Los vacíos por canjear, del que se terminó primero al último. */
export async function listarBaldesVacios(): Promise<BaldeVacio[]> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("baldes")
    .select("id, codigo, salio_en, sabores ( nombre )")
    .eq("estado", "vacio")
    .order("salio_en");

  return ((data as unknown as FilaBaldeVacio[] | null) ?? []).map((fila) => ({
    id: fila.id,
    codigo: fila.codigo,
    saborNombre: fila.sabores?.nombre ?? "",
    salioEn: fila.salio_en,
  }));
}
