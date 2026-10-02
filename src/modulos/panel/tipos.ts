import type { MedioPago } from "@/modulos/ventas/tipos";

/** Lo cobrado por medio de pago, sin las anuladas. Lo agrupa `ventas_del_periodo`. */
export type VentasPorMedio = { medioPago: MedioPago; cantidad: number; total: number };

/** Una hora del día DEL LOCAL (0 a 23) con lo que se vendió en ella. */
export type VentasEnHora = { hora: number; cantidad: number; total: number };

/** Los kilos que salieron de los baldes de un sabor, netos de correcciones. */
export type KilosDeSabor = { saborId: number; saborNombre: string; kg: number };

export type ResumenDelPeriodo = {
  porMedio: VentasPorMedio[];
  porHora: VentasEnHora[];
  porSabor: KilosDeSabor[];
};

export type TotalesDelPeriodo = {
  cantidad: number;
  total: number;
  /** Lo que gasta cada cliente, redondeado: la plata del local no tiene centavos. */
  ticketPromedio: number;
};
