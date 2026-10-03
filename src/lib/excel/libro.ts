import "server-only";
import writeXlsxFile, { type Cell } from "write-excel-file/node";
import { NOMBRE_COMERCIO } from "@/config/comercio";
import { diaLocal } from "@/lib/periodos";
import { aSlug } from "@/lib/slug";
import { titulo } from "./celdas";

/** Una hoja del libro: sus columnas con título y ancho, y una fila por registro. */
export type Hoja = {
  /** Hasta 31 caracteres y sin `[ ] : * ? / \`: es lo que Excel acepta de nombre de pestaña. */
  nombre: string;
  columnas: { titulo: string; ancho: number }[];
  filas: Cell[][];
};

/** Un archivo listo para bajar: el nombre sin extensión (sale con la fecha de hoy) y sus hojas. */
export type Libro = { nombre: string; hojas: Hoja[] };

/**
 * El libro de Excel de verdad (.xlsx), no un CSV: se abre con doble clic sin
 * importar la configuración regional de la compu (un CSV con comas o con punto
 * y coma depende de ella), los números llegan como números y las fechas como
 * fechas, y puede llevar varias hojas.
 */
export async function construirLibro(hojas: Hoja[]): Promise<Buffer> {
  return writeXlsxFile(
    hojas.map((hoja) => ({
      sheet: hoja.nombre,
      data: [hoja.columnas.map((columna) => titulo(columna.titulo)), ...hoja.filas],
      columns: hoja.columnas.map((columna) => ({ width: columna.ancho })),
      // La fila de títulos se queda arriba al bajar por la lista.
      stickyRowsCount: 1,
    })),
  ).toBuffer();
}

/** La respuesta HTTP que el navegador baja como archivo: el nombre del comercio, qué es y la fecha de hoy. */
export async function respuestaDeExcel(libro: Libro): Promise<Response> {
  const buffer = await construirLibro(libro.hojas);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${aSlug(NOMBRE_COMERCIO)}-${libro.nombre}-${diaLocal()}.xlsx"`,
      // Es el estado de hoy: que ningún caché intermedio entregue el de ayer.
      "Cache-Control": "no-store",
    },
  });
}
