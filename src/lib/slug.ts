/**
 * Un texto convertido en algo que sirve de nombre de archivo o de dirección:
 * minúsculas, sin acentos ni símbolos, con guiones en vez de espacios.
 * "Heladería Los Pinos" → "heladeria-los-pinos".
 *
 * Si no queda nada utilizable (un nombre que es solo símbolos), devuelve
 * "comercio": un archivo sin nombre es peor que uno con un nombre genérico.
 */
export function aSlug(texto: string): string {
  const limpio = texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return limpio === "" ? "comercio" : limpio;
}
