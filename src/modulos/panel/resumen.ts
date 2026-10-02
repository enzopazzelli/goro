import type {
  CostoDeLoVendido,
  Margen,
  TotalesDelPeriodo,
  Variacion,
  VentasPorMedio,
} from "./tipos";

/**
 * Los tres números de arriba del panel. Se derivan del desglose por medio de
 * pago en vez de pedirle otra suma a la base: ya vino todo lo que hace falta.
 */
export function totalesDelPeriodo(porMedio: VentasPorMedio[]): TotalesDelPeriodo {
  const cantidad = porMedio.reduce((suma, cada) => suma + cada.cantidad, 0);
  const total = porMedio.reduce((suma, cada) => suma + cada.total, 0);

  return { cantidad, total, ticketPromedio: cantidad === 0 ? 0 : Math.round(total / cantidad) };
}

/**
 * Un número al lado del mismo número de antes. Sin referencia, $148.000 no es
 * bueno ni malo: es un número.
 */
export function compararCon(valor: number, anterior: number): Variacion {
  return {
    valor,
    anterior,
    diferencia: valor - anterior,
    porcentaje: anterior === 0 ? null : (valor - anterior) / anterior,
  };
}

/**
 * El margen BRUTO del período: lo cobrado menos lo que costó lo que salió. El
 * costo se redondea una sola vez, al final — el helado viene con decimales
 * porque se valúa por kilo.
 */
export function margenDelPeriodo(vendido: number, costo: CostoDeLoVendido): Margen {
  const total = Math.round(costo.helado + costo.insumos);
  const ganancia = vendido - total;

  return { costo: total, ganancia, porcentaje: vendido === 0 ? null : ganancia / vendido };
}
