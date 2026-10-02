import type { VentasEnHora } from "./tipos";

export type HoraDelGrafico = VentasEnHora & {
  /** Qué parte de la barra más alta ocupa esta, de 0 a 1. */
  proporcion: number;
};

/** Cuánto de la barra más alta es este valor. Con todo en cero no hay nada que dibujar. */
export function proporcionDe(valor: number, maximo: number): number {
  return maximo === 0 ? 0 : valor / maximo;
}

/**
 * Las barras del gráfico, de la primera hora que vendió a la última.
 *
 * Las horas sin ventas del medio se rellenan en cero: la base devuelve solo las
 * que tienen filas, y si no se rellenan, un mediodía muerto queda pegado a la
 * tarde y parece que vendió. Las de los extremos no se rellenan — a las 3 de la
 * mañana el local está cerrado y media barra vacía no dice nada.
 */
export function horasDelGrafico(porHora: VentasEnHora[]): HoraDelGrafico[] {
  if (porHora.length === 0) return [];

  const horas = porHora.map((cada) => cada.hora);
  const primera = Math.min(...horas);
  const ultima = Math.max(...horas);
  const maximo = Math.max(...porHora.map((cada) => cada.total));

  return Array.from({ length: ultima - primera + 1 }, (_, indice) => {
    const hora = primera + indice;
    const vendido = porHora.find((cada) => cada.hora === hora);

    return {
      hora,
      cantidad: vendido?.cantidad ?? 0,
      total: vendido?.total ?? 0,
      proporcion: proporcionDe(vendido?.total ?? 0, maximo),
    };
  });
}
