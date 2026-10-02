import type { TotalesDelPeriodo, VentasPorMedio } from "./tipos";

/**
 * Los tres números de arriba del panel. Se derivan del desglose por medio de
 * pago en vez de pedirle otra suma a la base: ya vino todo lo que hace falta.
 */
export function totalesDelPeriodo(porMedio: VentasPorMedio[]): TotalesDelPeriodo {
  const cantidad = porMedio.reduce((suma, cada) => suma + cada.cantidad, 0);
  const total = porMedio.reduce((suma, cada) => suma + cada.total, 0);

  return { cantidad, total, ticketPromedio: cantidad === 0 ? 0 : Math.round(total / cantidad) };
}
