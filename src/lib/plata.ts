// "always" y no el default: según la versión de ICU, el español no separa los
// números de cuatro cifras ($3000), y un precio sin punto se lee mal de reojo.
const MILES = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0, useGrouping: "always" });

/** "45.000": el número solo, para cuando el signo pesos va aparte (el total grande del carrito). */
export function formatearMiles(monto: number): string {
  return MILES.format(monto);
}

/**
 * "$45.000", "−$3.500". El signo va adelante del $ y es un menos de verdad
 * (U+2212), no un guion: en una columna de montos un guion se pierde.
 */
export function formatearPlata(monto: number): string {
  const absoluto = `$${MILES.format(Math.abs(monto))}`;
  return monto < 0 ? `−${absoluto}` : absoluto;
}
