/**
 * Todo texto que cargó una persona (un nombre de sabor, el detalle de un gasto,
 * una nota) se sanea antes de escribirlo en una celda: si empieza con `=`, `+`,
 * `-` o `@`, Excel puede interpretarlo como una fórmula al abrir el archivo
 * (CSV injection, categoría documentada por OWASP). La comilla simple adelante
 * lo vuelve texto. También se incluyen el tabulador y el retorno de carro, que
 * la misma guía lista como inicios peligrosos.
 *
 * Los números NO pasan por acá: un monto negativo empieza con `-` y no por eso
 * es una inyección.
 */
const INICIO_PELIGROSO = /^[=+\-@\t\r]/;

export function sanearTexto(texto: string): string {
  return INICIO_PELIGROSO.test(texto) ? `'${texto}` : texto;
}
