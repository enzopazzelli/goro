import { entero, fechaYHora, kilos, plata, texto } from "@/lib/excel/celdas";
import type { Libro } from "@/lib/excel/libro";
import { ETIQUETA_MOTIVO, type Descarte, type TipoDescarte } from "./tipos";

const DE_DONDE: Record<TipoDescarte, string> = {
  balde: "Resto de balde",
  pote: "Pote armado",
  insumo: "Artículo",
};

/**
 * Una fila por cosa tirada, con el costo que tenía ese día. Es del dueño, como
 * todos los Excel: por eso puede decir quién cargó cada descarte.
 */
export function libroDeDescarte(descartes: Descarte[], nombres: Map<string, string>): Libro {
  return {
    nombre: "descarte",
    hojas: [
      {
        nombre: "Descartes",
        columnas: [
          { titulo: "Fecha y hora", ancho: 18 },
          { titulo: "Qué", ancho: 28 },
          { titulo: "De dónde", ancho: 16 },
          { titulo: "Cantidad", ancho: 11 },
          { titulo: "Unidad", ancho: 8 },
          { titulo: "Motivo", ancho: 20 },
          { titulo: "Nota", ancho: 36 },
          { titulo: "Costo", ancho: 12 },
          { titulo: "Registró", ancho: 20 },
        ],
        filas: descartes.map((descarte) => [
          fechaYHora(descarte.creadoEn),
          texto(descarte.que),
          texto(DE_DONDE[descarte.tipo]),
          descarte.unidad === "kg" ? kilos(descarte.cantidad) : entero(descarte.cantidad),
          texto(descarte.unidad),
          texto(ETIQUETA_MOTIVO[descarte.motivo]),
          texto(descarte.nota),
          plata(descarte.costo),
          texto(nombres.get(descarte.creadoPor)),
        ]),
      },
    ],
  };
}
