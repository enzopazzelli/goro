import { entero, fechaYHora, plata, texto } from "@/lib/excel/celdas";
import type { Libro } from "@/lib/excel/libro";
import { ETIQUETA_MEDIO_PAGO, type VentaConTicket } from "./tipos";

/** La venta con lo que solo importa en el archivo: quién la cobró y, si se anuló, quién y cuándo. */
export type VentaParaExcel = VentaConTicket & {
  creadoPor: string;
  anuladoEn: string | null;
  anuladoPor: string | null;
};

const ETIQUETA_ESTADO = { cobrada: "Cobrada", anulada: "Anulada" };

/**
 * Dos hojas, porque una venta tiene varios renglones: "Ventas" para sumar y
 * filtrar por medio de pago, y "Detalle" para saber QUÉ se vendió. El número de
 * venta es el hilo entre las dos.
 *
 * Las anuladas se incluyen y se marcan, en vez de esconderlas: el archivo tiene
 * que cerrar con la caja, y la caja las muestra. Para sumar solo lo cobrado, se
 * filtra por Estado.
 */
export function libroDeVentas(ventas: VentaParaExcel[], nombres: Map<string, string>): Libro {
  const quien = (id: string | null) => (id ? (nombres.get(id) ?? "") : "");

  return {
    nombre: "ventas",
    hojas: [
      {
        nombre: "Ventas",
        columnas: [
          { titulo: "N° de venta", ancho: 13 },
          { titulo: "Fecha y hora", ancho: 18 },
          { titulo: "Medio de pago", ancho: 16 },
          { titulo: "Total", ancho: 12 },
          { titulo: "Estado", ancho: 11 },
          { titulo: "Cobró", ancho: 20 },
          { titulo: "Anulada el", ancho: 18 },
          { titulo: "Anuló", ancho: 20 },
        ],
        filas: ventas.map((venta) => [
          entero(venta.id),
          fechaYHora(venta.creadoEn),
          texto(ETIQUETA_MEDIO_PAGO[venta.medioPago]),
          plata(venta.total),
          texto(ETIQUETA_ESTADO[venta.estado]),
          texto(quien(venta.creadoPor)),
          fechaYHora(venta.anuladoEn),
          texto(quien(venta.anuladoPor)),
        ]),
      },
      {
        nombre: "Detalle",
        columnas: [
          { titulo: "N° de venta", ancho: 13 },
          { titulo: "Fecha y hora", ancho: 18 },
          { titulo: "Artículo", ancho: 34 },
          { titulo: "Precio", ancho: 12 },
          { titulo: "Sabores", ancho: 36 },
          { titulo: "Medio de pago", ancho: 16 },
          { titulo: "Estado", ancho: 11 },
        ],
        filas: ventas.flatMap((venta) =>
          venta.items.map((item) => [
            entero(venta.id),
            fechaYHora(venta.creadoEn),
            texto(item.nombre),
            plata(item.precio),
            texto(item.sabores.map((sabor) => sabor.saborNombre).join(", ")),
            texto(ETIQUETA_MEDIO_PAGO[venta.medioPago]),
            texto(ETIQUETA_ESTADO[venta.estado]),
          ]),
        ),
      },
    ],
  };
}
