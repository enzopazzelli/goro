/*
 * Los tamaños de lo que se toca para armar un pedido. Goro pidió leer mejor
 * desde el mostrador, a un paso de la pantalla: viven acá para que formato,
 * sabor, balde y producto crezcan juntos y no queden cuatro tamaños distintos.
 */

/** "1 · Formato", "Productos": el título de cada grupo de tarjetas. */
export const ROTULO_DE_GRUPO = "mb-2 font-mono text-sm tracking-wide text-texto-suave uppercase";

/** Formato, balde y producto: nombre arriba, detalle y precio abajo. */
export const TARJETA =
  "flex flex-col items-center gap-1 rounded-(--radius-arco) border p-4 text-center transition";
export const TARJETA_LIBRE = "border-linea bg-superficie hover:bg-superficie-honda";
export const NOMBRE = "font-display text-lg leading-tight font-bold";
export const DETALLE = "font-mono text-sm opacity-75";
export const PRECIO = "numero text-lg font-semibold";
