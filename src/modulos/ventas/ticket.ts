import type { ItemDeTicket } from "./tipos";

/**
 * Lo que espera registrar_venta: cada item es un formato (con sus sabores), una
 * presentación de producto o un balde entero, exactamente uno. La base lo vuelve
 * a exigir.
 */
export type ItemParaServidor =
  | { formato_id: number; sabor_ids: number[] }
  | { presentacion_id: number }
  | { balde_sabor_id: number };

export function itemParaServidor(item: ItemDeTicket): ItemParaServidor {
  switch (item.tipo) {
    case "producto":
      return { presentacion_id: item.presentacionId };
    case "balde":
      return { balde_sabor_id: item.saborId };
    case "formato":
      return { formato_id: item.formatoId, sabor_ids: item.saborIds };
  }
}

export function itemsParaServidor(items: ItemDeTicket[]): ItemParaServidor[] {
  return items.map(itemParaServidor);
}

/**
 * Los sabores que se dibujan como puntos de color en el ticket. Un producto no
 * lleva sabores; un balde entero lleva uno solo, el suyo.
 */
export function saborIdsDe(item: ItemDeTicket): number[] {
  if (item.tipo === "formato") return item.saborIds;
  if (item.tipo === "balde") return [item.saborId];
  return [];
}

export function totalDelCarrito(items: { precio: number }[]): number {
  return items.reduce((suma, item) => suma + item.precio, 0);
}
