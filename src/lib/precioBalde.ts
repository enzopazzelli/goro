/**
 * El precio al que se vende el balde entero de un sabor: el suyo si lo tiene, y
 * si no, el del comercio. `null` si nadie puso ninguno — y entonces no se
 * vende: mejor frenar que cobrar un número que nadie eligió. Es el mismo
 * `coalesce` que hace `cobrar_item_balde` en la base; esta copia solo sirve
 * para mostrar el precio en la pantalla antes de cobrar.
 */
export function precioDeBalde(
  sabor: { precioBalde: number | null },
  precioPorDefecto: number | null,
): number | null {
  return sabor.precioBalde ?? precioPorDefecto;
}

/**
 * Lo que se tipeó en un campo de precio de balde: un entero positivo, o vacío
 * para volver al precio del comercio. La base lo vuelve a exigir con un `check`.
 */
export function leerPrecioDeBalde(texto: string): { valor: number | null } | { error: string } {
  const limpio = texto.trim();
  if (limpio === "") return { valor: null };

  const numero = Number(limpio);
  if (!Number.isInteger(numero) || numero <= 0) {
    return { error: "El precio tiene que ser un número entero mayor a cero." };
  }
  return { valor: numero };
}
