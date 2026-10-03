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
        presentaciones_insumo: { nombre: "Docena", unidades: 12, insumos: { nombre: "Bombón" } },
      }),
    ).toBe("Bombón · Docena ×12");
  });

  it("no explota si falta el insumo o no hay nada", () => {
    expect(
      nombreDeItem({
        formatos: null,
        presentaciones_insumo: { nombre: "Docena", unidades: 12, insumos: null },
      }),
    ).toBe("Docena ×12");
    expect(nombreDeItem({ formatos: null, presentaciones_insumo: null })).toBe("");
  });

  it("un pote armado se llama por su formato y el sabor de su balde", () => {
    expect(
      nombreDeItem({
        formatos: null,
        presentaciones_insumo: null,
        potes: { formatos: { nombre: "1/2 kilo" }, baldes: { sabores: { nombre: "Frutilla" } } },
      }),
    ).toBe("Pote 1/2 kilo · Frutilla");
  });

  it("un balde entero se llama por su sabor", () => {
    expect(
      nombreDeItem({
        formatos: null,
        presentaciones_insumo: null,
        baldes: { sabores: { nombre: "Chocolate" } },
      }),
    ).toBe("Balde entero · Chocolate");
  });
});
