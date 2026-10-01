const MILES = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

/**
 * "$45.000", "−$3.500". El signo va adelante del $ y es un menos de verdad
 * (U+2212), no un guion: en una columna de montos un guion se pierde.
 */
export function formatearPlata(monto: number): string {
  const absoluto = `$${MILES.format(Math.abs(monto))}`;
  return monto < 0 ? `−${absoluto}` : absoluto;
}
