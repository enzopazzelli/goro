import { describe, expect, it } from "vitest";
import { etiquetaPresentacion, textoPrecio } from "./etiquetaPresentacion";

describe("etiquetaPresentacion", () => {
  it("siempre dice cuántas unidades descuenta: Docena ×12", () => {
    expect(etiquetaPresentacion("Docena", 12)).toBe("Docena ×12");
  });

  it("la unidad también lleva su ×1, para que todas se lean igual", () => {
    expect(etiquetaPresentacion("Unidad", 1)).toBe("Unidad ×1");
  });

  it("no repite la cantidad cuando el nombre ya la dice: Decena x10, no 'Decena x10 ×10'", () => {
    expect(etiquetaPresentacion("Decena x10", 10)).toBe("Decena x10");
    expect(etiquetaPresentacion("Caja ×24", 24)).toBe("Caja ×24");
  });

  it("si el nombre dice otra cantidad que la real, muestra la real para no engañar", () => {
    expect(etiquetaPresentacion("Caja x24", 12)).toBe("Caja x24 ×12");
  });

  it("ignora los espacios de sobra en el nombre", () => {
    expect(etiquetaPresentacion("  Caja  ", 24)).toBe("Caja ×24");
  });
});

describe("textoPrecio", () => {
  it("muestra el precio de una presentación a la venta", () => {
    expect(textoPrecio({ activo: true, precio: 5000 })).toBe("$5.000");
  });

  it("dice 'sin precio' mientras no se le puso uno, esté activa o no", () => {
    expect(textoPrecio({ activo: false, precio: 0 })).toBe("sin precio");
  });

  it("una presentación con precio pero desactivada se ve como retirada", () => {
    expect(textoPrecio({ activo: false, precio: 5000 })).toBe("$5.000 (no se vende)");
  });
});
