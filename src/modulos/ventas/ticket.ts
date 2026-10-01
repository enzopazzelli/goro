import type { ItemDeTicket } from "./tipos";

/**
 * Lo que espera registrar_venta: cada item es un formato (con sus sabores) o
 * una presentación de producto, nunca las dos. La base lo vuelve a exigir.
 */
export type ItemParaServidor =
  { formato_id: number; sabor_ids: number[] } | { presentacion_id: number };

export function itemsParaServidor(items: ItemDeTicket[]): ItemParaServidor[] {
  return items.map((item) =>
    item.tipo === "producto"
      ? { presentacion_id: item.presentacionId }
      : { formato_id: item.formatoId, sabor_ids: item.saborIds },
  );
}

/** Un producto no lleva sabores: las pantallas que dibujan puntos de color lo tratan como lista vacía. */
export function saborIdsDe(item: ItemDeTicket): number[] {
  return item.tipo === "formato" ? item.saborIds : [];
}

export function totalDelCarrito(items: { precio: number }[]): number {
  return items.reduce((suma, item) => suma + item.precio, 0);
}
