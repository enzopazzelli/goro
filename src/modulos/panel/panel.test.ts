import { describe, expect, it } from "vitest";
import { ventasPorDiaSemana } from "./dias";
import { horasDelGrafico, proporcionDe } from "./grafico";
import { baldesDelPeriodo, compararCon, margenDelPeriodo, totalesDelPeriodo } from "./resumen";
import type { VentasEnDia, VentasEnHora, VentasPorMedio } from "./tipos";

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

describe("compararCon", () => {
  it("más que antes: la diferencia y su parte", () => {
    expect(compararCon(100, 80)).toEqual({
      valor: 100,
      anterior: 80,
      diferencia: 20,
      porcentaje: 0.25,
    });
  });

  it("menos que antes: la diferencia va en negativo", () => {
    const variacion = compararCon(80, 100);

    expect(variacion.diferencia).toBe(-20);
    expect(variacion.porcentaje).toBeCloseTo(-0.2);
  });

  it("si antes fue cero no hay porcentaje que calcular", () => {
    // Pasar de $0 a $5.000 no es "subió un 100%": es que antes no había nada.
    expect(compararCon(5000, 0).porcentaje).toBeNull();
  });
});

describe("margenDelPeriodo", () => {
  it("lo cobrado menos lo que costó lo que salió", () => {
    const margen = margenDelPeriodo(10000, { helado: 2500.4, insumos: 1500, envases: 0 });

    expect(margen).toEqual({ costo: 4000, ganancia: 6000, porcentaje: 0.6 });
  });

  it("el costo se redondea una sola vez, al final", () => {
    // 1000,6 + 1000,6 = 2001,2 → 2001. Redondeando cada uno darían 2002.
    expect(margenDelPeriodo(5000, { helado: 1000.6, insumos: 1000.6, envases: 0 }).costo).toBe(
      2001,
    );
  });

  it("sin ventas no hay porcentaje", () => {
    expect(margenDelPeriodo(0, { helado: 0, insumos: 0, envases: 0 }).porcentaje).toBeNull();
  });

  it("vender por debajo del costo da ganancia negativa", () => {
    expect(margenDelPeriodo(1000, { helado: 1500, insumos: 0, envases: 0 }).ganancia).toBe(-500);
  });
});

describe("ventasPorDiaSemana", () => {
  const dia = (dia: string, cantidad: number, total: number): VentasEnDia => ({
    dia,
    cantidad,
    total,
  });

  it("junta los días del mismo nombre y promedia", () => {
    // Dos sábados (26/09 y 03/10) y un lunes (28/09).
    const semana = ventasPorDiaSemana([
      dia("2026-09-26", 10, 50000),
      dia("2026-09-28", 4, 20000),
      dia("2026-10-03", 14, 70000),
    ]);

    expect(semana).toEqual([
      { diaSemana: 1, cantidad: 4, total: 20000, dias: 1, promedio: 20000 },
      { diaSemana: 6, cantidad: 24, total: 120000, dias: 2, promedio: 60000 },
    ]);
  });

  it("ordena de lunes a domingo, no de domingo a sábado", () => {
    const semana = ventasPorDiaSemana([dia("2026-10-04", 1, 1000), dia("2026-09-28", 1, 1000)]);

    expect(semana.map((cada) => cada.diaSemana)).toEqual([1, 0]);
  });

  it("los días que el período no incluye no aparecen", () => {
    expect(ventasPorDiaSemana([dia("2026-10-01", 1, 1000)])).toHaveLength(1);
  });

  it("sin ventas no hay nada que agrupar", () => {
    expect(ventasPorDiaSemana([])).toEqual([]);
  });
});

describe("margenDelPeriodo: baldes vendidos enteros", () => {
  it("el envase que se lleva el cliente entra en el costo", () => {
    // Un balde de $10.000 de helado vendido a $85.000, con un envase de $9.000:
    // la ganancia real no es $75.000 sino $66.000.
    const margen = margenDelPeriodo(85000, { helado: 10000, insumos: 0, envases: 9000 });

    expect(margen).toEqual({ costo: 19000, ganancia: 66000, porcentaje: 66000 / 85000 });
  });
});

describe("baldesDelPeriodo", () => {
  it("separa los que volvieron al proveedor de los que se fueron con el cliente", () => {
    const baldes = baldesDelPeriodo([
      { estado: "vacio", cantidad: 1, costo_envase: 9000 },
      { estado: "canjeado", cantidad: 3, costo_envase: 27000 },
      { estado: "vendido", cantidad: 2, costo_envase: 18000 },
    ]);

    expect(baldes).toEqual({
      terminados: 4,
      vendidos: 2,
      envasesPorReponer: 18000,
      envasesAhorrados: 36000,
    });
  });

  it("sin baldes todo es cero", () => {
    expect(baldesDelPeriodo([])).toEqual({
      terminados: 0,
      vendidos: 0,
      envasesPorReponer: 0,
      envasesAhorrados: 0,
    });
  });
});
