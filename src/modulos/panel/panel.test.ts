import { describe, expect, it } from "vitest";
import { horasDelGrafico, proporcionDe } from "./grafico";
import { totalesDelPeriodo } from "./resumen";
import type { VentasEnHora, VentasPorMedio } from "./tipos";

function medio(medioPago: VentasPorMedio["medioPago"], cantidad: number, total: number) {
  return { medioPago, cantidad, total };
}

function hora(hora: number, cantidad: number, total: number): VentasEnHora {
  return { hora, cantidad, total };
}

describe("totalesDelPeriodo", () => {
  it("suma los medios de pago y saca el ticket promedio", () => {
    const totales = totalesDelPeriodo([medio("efectivo", 8, 40000), medio("tarjeta", 2, 20000)]);

    expect(totales).toEqual({ cantidad: 10, total: 60000, ticketPromedio: 6000 });
  });

  it("el ticket promedio se redondea: la plata del local no tiene centavos", () => {
    expect(totalesDelPeriodo([medio("efectivo", 3, 10000)]).ticketPromedio).toBe(3333);
  });

  it("sin ventas no divide por cero", () => {
    expect(totalesDelPeriodo([])).toEqual({ cantidad: 0, total: 0, ticketPromedio: 0 });
  });
});

describe("horasDelGrafico", () => {
  it("rellena las horas sin ventas para que el gráfico no mienta", () => {
    // De 11 a 13 con el mediodía vacío: si la hora sin ventas no se dibuja,
    // las barras quedan pegadas y parece que vendió las tres horas.
    const horas = horasDelGrafico([hora(11, 2, 10000), hora(13, 1, 5000)]);

    expect(horas.map((cada) => cada.hora)).toEqual([11, 12, 13]);
    expect(horas[1]).toEqual({ hora: 12, cantidad: 0, total: 0, proporcion: 0 });
  });

  it("arranca y termina en las horas que vendieron, no a medianoche", () => {
    const horas = horasDelGrafico([hora(20, 1, 5000), hora(21, 1, 5000)]);

    expect(horas.map((cada) => cada.hora)).toEqual([20, 21]);
  });

  it("la barra más alta llega a 1 y las otras son su proporción", () => {
    const horas = horasDelGrafico([hora(16, 1, 2500), hora(17, 4, 10000)]);

    expect(horas[0]?.proporcion).toBe(0.25);
    expect(horas[1]?.proporcion).toBe(1);
  });

  it("sin ventas no hay gráfico", () => {
    expect(horasDelGrafico([])).toEqual([]);
  });

  it("una sola hora vendida es una sola barra, llena", () => {
    expect(horasDelGrafico([hora(18, 3, 9000)])).toEqual([
      { hora: 18, cantidad: 3, total: 9000, proporcion: 1 },
    ]);
  });
});

describe("proporcionDe", () => {
  it("es la parte del máximo", () => {
    expect(proporcionDe(3, 12)).toBe(0.25);
  });

  it("con máximo cero no explota", () => {
    expect(proporcionDe(0, 0)).toBe(0);
  });
});
