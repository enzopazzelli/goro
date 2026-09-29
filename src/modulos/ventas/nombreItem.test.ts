import { describe, expect, it } from "vitest";
import { nombreDeItem } from "./nombreItem";

describe("nombreDeItem", () => {
  it("usa el nombre del formato cuando el item es un formato", () => {
    expect(
      nombreDeItem({ formatos: { nombre: "Cucurucho doble" }, presentaciones_insumo: null }),
    ).toBe("Cucurucho doble");
  });

  it("junta insumo y presentación cuando el item es un producto", () => {
    expect(
      nombreDeItem({
        formatos: null,
        presentaciones_insumo: { nombre: "Docena", insumos: { nombre: "Bombón" } },
      }),
    ).toBe("Bombón · Docena");
  });

  it("no explota si falta el insumo o no hay nada", () => {
    expect(
      nombreDeItem({ formatos: null, presentaciones_insumo: { nombre: "Docena", insumos: null } }),
    ).toBe("Docena");
    expect(nombreDeItem({ formatos: null, presentaciones_insumo: null })).toBe("");
  });
});
