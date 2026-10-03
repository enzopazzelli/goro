import "server-only";
import { listarBaldes } from "@/lib/baldes";
import { listarSabores } from "@/lib/sabores";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { BaldeParaArmar, PoteEnFreezer } from "../tipos";

type FilaPote = {
  id: number;
  codigo: string;
  peso_g: number;
  precio: number;
  armado_en: string;
  formatos: { nombre: string } | null;
  baldes: { sabores: { nombre: string } | null } | null;
};

/** Cuántos potes se muestran: más de eso en el freezer a la vez no es una lista, es un inventario. */
export const TOPE_DE_POTES = 300;

/** Los potes que siguen en el freezer, del más nuevo al más viejo. */
export async function potesEnFreezer(): Promise<PoteEnFreezer[]> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("potes")
    .select(
      "id, codigo, peso_g, precio, armado_en, formatos ( nombre ), baldes ( sabores ( nombre ) )",
    )
    .eq("estado", "impreso")
    .order("id", { ascending: false })
    .limit(TOPE_DE_POTES);

  return ((data as unknown as FilaPote[] | null) ?? []).map((fila) => ({
    id: fila.id,
    codigo: fila.codigo,
    formatoNombre: fila.formatos?.nombre ?? "",
    saborNombre: fila.baldes?.sabores?.nombre ?? "",
    pesoG: fila.peso_g,
    precio: fila.precio,
    armadoEn: fila.armado_en,
  }));
}

/** Los baldes abiertos (uno por sabor como mucho), con el nombre del sabor. */
export async function baldesParaArmar(): Promise<BaldeParaArmar[]> {
  const [baldes, sabores] = await Promise.all([listarBaldes(), listarSabores()]);
  const nombres = new Map(sabores.map((sabor) => [sabor.id, sabor.nombre]));

  return baldes
    .filter((balde) => balde.estado === "abierto")
    .map((balde) => ({
      id: balde.id,
      saborNombre: nombres.get(balde.saborId) ?? "",
      kgRestante: balde.kgRestante,
    }))
    .sort((a, b) => a.saborNombre.localeCompare(b.saborNombre));
}
