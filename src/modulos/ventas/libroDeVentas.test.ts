import { describe, expect, it } from "vitest";
import { libroDeVentas, type VentaParaExcel } from "./libroDeVentas";

const NOMBRES = new Map([
  ["u1", "Ana"],
  ["u2", "Goro"],
]);

function venta(cambios: Partial<VentaParaExcel> = {}): VentaParaExcel {
  return {
    id: 7,
    medioPago: "efectivo",
    total: 9500,
    estado: "cobrada",
    creadoEn: "2026-10-01T15:30:00Z",
    creadoPor: "u1",
    anuladoEn: null,
    anuladoPor: null,
    items: [
      {
        id: 1,
        nombre: "1/2 kilo",
        precio: 6500,
        sabores: [
          { saborId: 1, saborNombre: "Frutilla" },
          { saborId: 2, saborNombre: "Dulce de leche" },
        ],
      },
      { id: 2, nombre: "Bombón · Docena ×12", precio: 3000, sabores: [] },
    ],
    ...cambios,
  };
}

const valor = (celda: unknown) => (celda as { value?: unknown } | null)?.value ?? null;

describe("libroDeVentas", () => {
  it("una fila por venta y una por cada renglón, unidas por el número de venta", () => {
    const libro = libroDeVentas([venta()], NOMBRES);
    const [ventas, detalle] = libro.hojas;

    expect(ventas!.filas).toHaveLength(1);
    expect(detalle!.filas).toHaveLength(2);
    expect(valor(ventas!.filas[0]![0])).toBe(7);
    expect(detalle!.filas.map((fila) => valor(fila[0]))).toEqual([7, 7]);
  });

  it("dice quién cobró por su nombre, la fecha con la hora del local y el total como número", () => {
    const fila = libroDeVentas([venta()], NOMBRES).hojas[0]!.filas[0]!;

    expect(valor(fila[1])).toEqual(new Date("2026-10-01T12:30:00.000Z"));
    expect(valor(fila[2])).toBe("Efectivo");
    expect(valor(fila[3])).toBe(9500);
    expect(valor(fila[5])).toBe("Ana");
  });

  it("una venta anulada se incluye, marcada, con quién y cuándo la anuló", () => {
    const anulada = venta({
      estado: "anulada",
      anuladoEn: "2026-10-01T16:00:00Z",
      anuladoPor: "u2",
    });
    const fila = libroDeVentas([anulada], NOMBRES).hojas[0]!.filas[0]!;

    expect(valor(fila[4])).toBe("Anulada");
    expect(valor(fila[6])).toEqual(new Date("2026-10-01T13:00:00.000Z"));
    expect(valor(fila[7])).toBe("Goro");
  });

  it("los sabores de un renglón van juntos en una celda", () => {
    const detalle = libroDeVentas([venta()], NOMBRES).hojas[1]!;

    expect(valor(detalle.filas[0]![4])).toBe("Frutilla, Dulce de leche");
    expect(valor(detalle.filas[1]![4])).toBeNull();
  });

  it("un nombre de usuario que ya no se puede leer queda vacío en vez de romper", () => {
    const fila = libroDeVentas([venta({ creadoPor: "desconocido" })], NOMBRES).hojas[0]!.filas[0]!;
    expect(valor(fila[5])).toBeNull();
  });
});
