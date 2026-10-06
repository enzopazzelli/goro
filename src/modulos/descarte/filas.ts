import type { Descarte, MotivoDescarte, TipoDescarte, Unidad } from "./tipos";

/** Lo que se pide a la base por cada descarte: los nombres llegan por las foreign keys. */
export const COLUMNAS_DE_DESCARTE =
  "id, tipo, insumo_id, cantidad, unidad, motivo, nota, costo, creado_por, creado_en, insumos(nombre), baldes(sabor_id, sabores(nombre))";

export type FilaDescarte = {
  id: number;
  tipo: TipoDescarte;
  insumo_id: number | null;
  /** numeric llega como texto: sumarlo sin convertir concatena. */
  cantidad: number | string;
  unidad: Unidad;
  motivo: MotivoDescarte;
  nota: string | null;
  costo: number;
  creado_por: string;
  creado_en: string;
  insumos: { nombre: string } | null;
  baldes: { sabor_id: number; sabores: { nombre: string } | null } | null;
};

/**
 * Un resto de balde y un pote son helado de un sabor: se suman juntos, en kilos.
 * Un artículo se suma por artículo Y por unidad, porque el dueño puede pasar
 * un insumo de unidades a kilos y dos unidades distintas no se suman.
 */
export function descarteDeFila(fila: FilaDescarte): Descarte {
  const esHelado = fila.tipo !== "insumo";

  return {
    id: fila.id,
    tipo: fila.tipo,
    que: esHelado
      ? (fila.baldes?.sabores?.nombre ?? "Sabor sin nombre")
      : (fila.insumos?.nombre ?? "Artículo sin nombre"),
    grupo: esHelado ? `sabor:${fila.baldes?.sabor_id}` : `insumo:${fila.insumo_id}:${fila.unidad}`,
    cantidad: Number(fila.cantidad),
    unidad: fila.unidad,
    motivo: fila.motivo,
    nota: fila.nota,
    costo: fila.costo,
    creadoPor: fila.creado_por,
    creadoEn: fila.creado_en,
  };
}
