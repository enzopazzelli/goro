import { etiquetaPresentacion } from "@/lib/etiquetaPresentacion";
import type { Presentacion } from "@/lib/presentaciones";
import type { ItemEnCarrito } from "./tipos";

/** Un producto tal como entra al ticket: igual si se toca su tarjeta o se lo busca por nombre. */
export function itemDePresentacion(presentacion: Presentacion): ItemEnCarrito {
  return {
    tipo: "producto",
    presentacionId: presentacion.id,
    nombre: `${presentacion.insumoNombre} · ${etiquetaPresentacion(presentacion.nombre, presentacion.unidades)}`,
    precio: presentacion.precio,
    saboresNombres: [],
  };
}
