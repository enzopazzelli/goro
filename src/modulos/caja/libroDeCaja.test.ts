import { describe, expect, it } from "vitest";
import { libroDeCaja, type DatosDeCaja } from "./libroDeCaja";

const NOMBRES = new Map([
  ["u1", "Ana"],
  ["u2", "Goro"],
]);

const DATOS: DatosDeCaja = {
  turnos: [
    {
      id: 5,
      abiertoPor: "u1",
      abiertoEn: "2026-10-01T14:00:00Z",
      cerradoPor: "u2",
      cerradoEn: "2026-10-02T01:30:00Z",
    },
    {
      id: 6,
      abiertoPor: "u1",
      abiertoEn: "2026-10-02T14:00:00Z",
      cerradoPor: null,
      cerradoEn: null,
    },
  ],
  movimientos: [
    {
      id: 1,
      turnoId: 5,
      tipo: "apertura",
      monto: 20000,
      detalle: null,
      ventaId: null,
      creadoPor: "u1",
      creadoEn: "2026-10-01T14:00:00Z",
      anulado: false,
    },
    {
      id: 2,
      turnoId: 5,
      tipo: "gasto",
      monto: -1500,
      detalle: "=Servilletas",
      ventaId: null,
      creadoPor: "u1",
      creadoEn: "2026-10-01T18:00:00Z",
      anulado: true,
    },
  ],
  arqueos: [{ turnoId: 5, esperado: 18500, contado: 18000, diferencia: -500, fondoQueQueda: 5000 }],
};

const valor = (celda: unknown) => (celda as { value?: unknown } | null)?.value ?? null;

describe("libroDeCaja", () => {
  const libro = libroDeCaja(DATOS, NOMBRES);
  const [turnos, movimientos] = libro.hojas;

  it("un turno cerrado trae su arqueo: lo esperado, lo contado y la diferencia con su signo", () => {
    const fila = turnos!.filas[0]!;

    expect(valor(fila[1])).toBe("Ana");
    expect(valor(fila[3])).toBe("Goro");
    expect(valor(fila[5])).toBe(20000);
    expect(valor(fila[6])).toBe(18500);
    expect(valor(fila[7])).toBe(18000);
    expect(valor(fila[8])).toBe(-500);
    expect(valor(fila[9])).toBe(5000);
  });

  it("un turno todavía abierto no tiene arqueo ni cierre: las celdas quedan vacías, no en cero", () => {
    const fila = turnos!.filas[1]!;

    expect(valor(fila[3])).toBeNull();
    expect(valor(fila[4])).toBeNull();
    expect(valor(fila[6])).toBeNull();
    expect(valor(fila[8])).toBeNull();
  });

  it("los movimientos salen con su signo, los anulados marcados, y el detalle saneado", () => {
    const gasto = movimientos!.filas[1]!;

    expect(valor(gasto[2])).toBe("Gasto");
    expect(valor(gasto[3])).toBe("'=Servilletas");
    expect(valor(gasto[4])).toBe(-1500);
    expect(valor(gasto[5])).toBe("Sí");
  });

  it("cada fila tiene tantas celdas como columnas", () => {
    for (const hoja of libro.hojas) {
      for (const fila of hoja.filas) expect(fila).toHaveLength(hoja.columnas.length);
    }
  });
});
