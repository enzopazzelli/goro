import { describe, expect, it } from "vitest";
import { leerPrecioDeBalde, precioDeBalde } from "./precioBalde";

describe("precioDeBalde", () => {
  it("el precio propio del sabor pisa el del comercio", () => {
    expect(precioDeBalde({ precioBalde: 90000 }, 80000)).toBe(90000);
  });

  it("sin precio propio usa el del comercio", () => {
    expect(precioDeBalde({ precioBalde: null }, 80000)).toBe(80000);
  });

  it("sin ninguno de los dos no hay precio, y no se vende", () => {
    expect(precioDeBalde({ precioBalde: null }, null)).toBeNull();
  });
});

describe("leerPrecioDeBalde", () => {
  it("un entero positivo es el precio, y vacío es volver al del comercio", () => {
    expect(leerPrecioDeBalde("85000")).toEqual({ valor: 85000 });
    expect(leerPrecioDeBalde("  ")).toEqual({ valor: null });
  });

  it("rechaza cero, negativos y decimales", () => {
    for (const malo of ["0", "-5", "10.5", "abc"]) {
      expect(leerPrecioDeBalde(malo)).toHaveProperty("error");
    }
  });
});
