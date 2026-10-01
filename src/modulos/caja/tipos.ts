import type { EstadoVenta, MedioPago } from "@/modulos/ventas/tipos";

export type TipoMovimientoCaja =
  "apertura" | "venta" | "anulacion" | "ingreso" | "gasto" | "retiro";

/** Los que se cargan a mano. Los demás los escriben abrir_caja, registrar_venta y anular_venta. */
export type TipoManual = "ingreso" | "gasto" | "retiro";

export const TIPOS_MANUALES: readonly TipoManual[] = ["ingreso", "gasto", "retiro"];

export function esManual(tipo: TipoMovimientoCaja): tipo is TipoManual {
  return (TIPOS_MANUALES as readonly string[]).includes(tipo);
}

export const ETIQUETA_TIPO: Record<TipoMovimientoCaja, string> = {
  apertura: "Apertura",
  venta: "Venta",
  anulacion: "Anulación",
  ingreso: "Ingreso",
  gasto: "Gasto",
  retiro: "Retiro",
};

export type MovimientoCaja = {
  id: number;
  tipo: TipoMovimientoCaja;
  /** Con signo: entra +, sale −. */
  monto: number;
  detalle: string | null;
  ventaId: number | null;
  creadoPor: string;
  creadoEn: string;
  anulado: boolean;
};

export type Turno = {
  id: number;
  abiertoPor: string;
  abiertoEn: string;
};

export type VentaDelTurno = {
  id: number;
  medioPago: MedioPago;
  total: number;
  estado: EstadoVenta;
  creadoEn: string;
};

/** Solo lo lee el dueño: RLS de `arqueos`. */
export type Arqueo = {
  esperado: number;
  contado: number;
  diferencia: number;
  fondoQueQueda: number;
};

export type TurnoCerrado = Turno & {
  cerradoPor: string;
  cerradoEn: string;
  apertura: number;
  arqueo: Arqueo | null;
  /** Lo que dejó de fondo el cierre anterior; null si es el primer turno o no se llegó a leer. */
  fondoAnterior: number | null;
};
