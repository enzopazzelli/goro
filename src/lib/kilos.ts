const KILOS = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });

/**
 * "1,5 kg". Un decimal y coma, como se escribe acá: con `toFixed` sale "1.5",
 * que en una pantalla en español se lee como otro número.
 */
export function formatearKilos(kg: number): string {
  return `${KILOS.format(kg)} kg`;
}
