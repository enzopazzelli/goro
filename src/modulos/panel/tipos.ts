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
  porDia: VentasEnDia[];
  porArticulo: ArticuloVendido[];
  costo: CostoDeLoVendido;
  /** Lo mismo, del período anterior equivalente: es con lo que se compara. */
  porMedioAnterior: VentasPorMedio[];
};

export type TotalesDelPeriodo = {
  cantidad: number;
  total: number;
  /** Lo que gasta cada cliente, redondeado: la plata del local no tiene centavos. */
  ticketPromedio: number;
};

/** Una fila por día del local, de `ventas_por_dia`. El día es "AAAA-MM-DD". */
export type VentasEnDia = { dia: string; cantidad: number; total: number };

/** Cuánto rinde cada día de la semana en el período, y en cuántos días se midió. */
export type VentasEnDiaSemana = {
  /** 0 el domingo, 6 el sábado, como `diaDeSemanaDe`. */
  diaSemana: number;
  cantidad: number;
  total: number;
  /** Cuántos días de ese nombre hubo con ventas: sin esto, el total no se puede leer. */
  dias: number;
  promedio: number;
};

export type ArticuloVendido = { nombre: string; unidades: number; total: number };

/** Lo que costó lo que salió, separado por naturaleza: los baldes y el ledger de insumos. */
export type CostoDeLoVendido = { helado: number; insumos: number };

/** Un número contra el mismo número del período anterior. */
export type Variacion = {
  valor: number;
  anterior: number;
  diferencia: number;
  /** `null` cuando el período anterior fue cero: no hay con qué comparar. */
  porcentaje: number | null;
};

export type Margen = {
  costo: number;
  ganancia: number;
  /** Qué parte de lo cobrado quedó, de 0 a 1. `null` si no se vendió nada. */
  porcentaje: number | null;
};
