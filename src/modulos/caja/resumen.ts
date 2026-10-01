import type { MedioPago } from "@/modulos/ventas/tipos";
import type { MovimientoCaja, VentaDelTurno } from "./tipos";

export type ResumenTurno = {
  fondo: number;
  /** Lo que entró por ventas en efectivo, antes de anulaciones: así los números suman al esperado. */
  ventasEfectivo: number;
  ingresos: number;
  gastos: number;
  retiros: number;
  anulaciones: number;
  /** Fondo + ventas en efectivo + ingresos − gastos − retiros − anulaciones. */
  esperado: number;
  /** Ventas cobradas del turno por medio, sin las anuladas. Tarjeta y transferencia no pasan por el cajón. */
  porMedio: Record<MedioPago, number>;
};

/**
 * La misma cuenta que congela `cerrar_caja` en la base: la suma de los
 * movimientos no anulados. Un test de base compara los dos números; si el SQL
 * y la pantalla dejan de coincidir, ese test falla.
 */
export function resumenDelTurno(
  movimientos: MovimientoCaja[],
  ventas: VentaDelTurno[],
): ResumenTurno {
  const vigentes = movimientos.filter((movimiento) => !movimiento.anulado);
  const suma = (tipo: MovimientoCaja["tipo"]) =>
    vigentes
      .filter((movimiento) => movimiento.tipo === tipo)
      .reduce((total, movimiento) => total + movimiento.monto, 0);
  // `0 -` y no `-`: negar una suma vacía da -0, que se compara mal y se imprime "-0".
  const salida = (tipo: MovimientoCaja["tipo"]) => 0 - suma(tipo);

  const porMedio: Record<MedioPago, number> = { efectivo: 0, tarjeta: 0, transferencia: 0 };
  for (const venta of ventas) {
    if (venta.estado === "cobrada") porMedio[venta.medioPago] += venta.total;
  }

  return {
    fondo: suma("apertura"),
    ventasEfectivo: suma("venta"),
    ingresos: suma("ingreso"),
    gastos: salida("gasto"),
    retiros: salida("retiro"),
    anulaciones: salida("anulacion"),
    esperado: vigentes.reduce((total, movimiento) => total + movimiento.monto, 0),
    porMedio,
  };
}
