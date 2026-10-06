import "server-only";
import { leerTodo } from "@/lib/paginar";
import { rangoUtc, type Periodo } from "@/lib/periodos";
import { clienteServidor } from "@/lib/supabase/servidor";
import { COLUMNAS_DE_DESCARTE, descarteDeFila, type FilaDescarte } from "../filas";
import type { ArticuloDescartable, Descarte } from "../tipos";

/** Todo lo descartado en el período, lo más nuevo primero. De a mil filas: un mes puede pasarse. */
export async function descartesDelPeriodo(periodo: Periodo): Promise<Descarte[]> {
  const { desdeIso, hastaIso } = rangoUtc(periodo);
  const supabase = await clienteServidor();

  const filas = await leerTodo<FilaDescarte>((desde, hasta) =>
    supabase
      .from("descartes")
      .select(COLUMNAS_DE_DESCARTE)
      .gte("creado_en", desdeIso)
      .lt("creado_en", hastaIso)
      .order("id", { ascending: false })
      .range(desde, hasta),
  );
  return filas.map(descarteDeFila);
}

type FilaArticulo = {
  id: number;
  nombre: string;
  unidad: ArticuloDescartable["unidad"];
  tipo: ArticuloDescartable["tipo"];
  cantidad: number | string;
};

/** Lo que se puede elegir de la lista: los artículos activos, con su stock al lado. */
export async function articulosDescartables(): Promise<ArticuloDescartable[]> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("insumos")
    .select("id, nombre, unidad, tipo, cantidad")
    .eq("activo", true)
    .order("nombre");

  return ((data as FilaArticulo[] | null) ?? []).map((fila) => ({
    ...fila,
    cantidad: Number(fila.cantidad),
  }));
}
