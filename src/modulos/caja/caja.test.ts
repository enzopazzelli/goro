import { describe, expect, it } from "vitest";
import { textoDiferencia } from "./arqueo";
import { armarHistorial, diferenciaDeApertura, TURNOS_EN_HISTORIAL } from "./historial";
import { resumenDelTurno } from "./resumen";
import type { Arqueo, MovimientoCaja, VentaDelTurno } from "./tipos";

let siguienteId = 1;
function movimiento(tipo: MovimientoCaja["tipo"], monto: number, anulado = false): MovimientoCaja {
  return {
    id: siguienteId++,
    tipo,
    monto,
    detalle: null,
    ventaId: null,
    creadoPor: "u",
    creadoEn: "2026-10-01T14:30:00Z",
    anulado,
  };
}

function venta(
  medioPago: VentaDelTurno["medioPago"],
  total: number,
  anulada = false,
): VentaDelTurno {
  return {
    id: siguienteId++,
    medioPago,
    total,
    estado: anulada ? "anulada" : "cobrada",
    creadoEn: "2026-10-01T15:00:00Z",
  };
}

describe("resumenDelTurno", () => {
  // El mismo turno que el escenario de base: 45.000 + 3.000 + 3.000 + 5.000
  // − 10.000 − 3.000 = 43.000, con un gasto de 12.000 anulado que no cuenta.
  const movimientos = [
    movimiento("apertura", 45000),
    movimiento("venta", 3000),
    movimiento("venta", 3000),
    movimiento("gasto", -12000, true),
    movimiento("ingreso", 5000),
    movimiento("retiro", -10000),
    movimiento("anulacion", -3000),
  ];

  it("el esperado es la suma de lo no anulado", () => {
    expect(resumenDelTurno(movimientos, []).esperado).toBe(43000);
  });

  it("los parciales suman exactamente al esperado", () => {
    const r = resumenDelTurno(movimientos, []);
    expect(r).toMatchObject({
      fondo: 45000,
      ventasEfectivo: 6000,
      ingresos: 5000,
      gastos: 0,
      retiros: 10000,
      anulaciones: 3000,
    });
    expect(r.fondo + r.ventasEfectivo + r.ingresos - r.gastos - r.retiros - r.anulaciones).toBe(
      r.esperado,
    );
  });

  it("por medio de pago cuenta solo las ventas cobradas", () => {
    const ventas = [
      venta("efectivo", 3000),
      venta("efectivo", 3000, true),
      venta("tarjeta", 5000),
      venta("transferencia", 2000),
      venta("transferencia", 1000),
    ];
    expect(resumenDelTurno([], ventas).porMedio).toEqual({
      efectivo: 3000,
      tarjeta: 5000,
      transferencia: 3000,
    });
  });

  it("un turno recién abierto espera solo el fondo", () => {
    expect(resumenDelTurno([movimiento("apertura", 20000)], []).esperado).toBe(20000);
  });
});

describe("textoDiferencia", () => {
  it("cero se dice, no se esconde", () => {
    expect(textoDiferencia(0)).toEqual({ texto: "Cierra justo", variante: "ok" });
  });

  it("sobrante y faltante, con el monto en positivo", () => {
    expect(textoDiferencia(1500)).toEqual({ texto: "Sobran $1.500", variante: "advertencia" });
    expect(textoDiferencia(-3500)).toEqual({ texto: "Faltan $3.500", variante: "alerta" });
  });
});

describe("armarHistorial", () => {
  const turno = (id: number) => ({
    id,
    abiertoPor: "u",
    abiertoEn: "2026-10-01T09:00:00Z",
    cerradoPor: "u",
    cerradoEn: "2026-10-01T14:00:00Z",
  });
  const arqueo = (fondoQueQueda: number): Arqueo => ({
    esperado: 0,
    contado: fondoQueQueda,
    diferencia: 0,
    fondoQueQueda,
  });

  it("compara cada apertura con el fondo que dejó el turno anterior", () => {
    const historial = armarHistorial(
      [turno(3), turno(2), turno(1)],
      new Map([
        [3, 20000],
        [2, 15000],
        [1, 10000],
      ]),
      new Map([
        [2, arqueo(20000)],
        [1, arqueo(16000)],
      ]),
    );

    expect(historial.map((t) => t.fondoAnterior)).toEqual([20000, 16000, null]);
    expect(historial.map(diferenciaDeApertura)).toEqual([0, -1000, null]);
    expect(historial[0]!.arqueo).toBeNull();
  });

  it("el turno de más solo sirve de referencia y no se muestra", () => {
    const turnos = Array.from({ length: TURNOS_EN_HISTORIAL + 1 }, (_, i) => turno(100 - i));
    const ultimo = turnos[TURNOS_EN_HISTORIAL]!;
    const historial = armarHistorial(turnos, new Map(), new Map([[ultimo.id, arqueo(7000)]]));

    expect(historial).toHaveLength(TURNOS_EN_HISTORIAL);
    expect(historial.at(-1)!.fondoAnterior).toBe(7000);
  });
});
