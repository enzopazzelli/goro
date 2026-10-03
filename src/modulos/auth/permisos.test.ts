import { describe, expect, it } from "vitest";
import { esPermiso, puede, resumenDePermisos } from "./permisos";

describe("puede", () => {
  it("el dueño puede todo, aunque su lista esté vacía", () => {
    expect(puede({ rol: "duenio", permisos: [] }, "anular_ventas")).toBe(true);
  });

  it("un colaborador puede solo lo que tiene en la lista", () => {
    const ana = { rol: "colaborador", permisos: ["movimientos_caja"] } as const;
    expect(puede(ana, "movimientos_caja")).toBe(true);
    expect(puede(ana, "anular_ventas")).toBe(false);
  });
});

describe("esPermiso", () => {
  it("rechaza lo que no está en la lista fija", () => {
    expect(esPermiso("anular_ventas")).toBe(true);
    expect(esPermiso("borrar_todo")).toBe(false);
    expect(esPermiso("")).toBe(false);
  });
});

describe("resumenDePermisos", () => {
  it("dice 'Solo vender' cuando no tiene ninguno, y 'Todo' cuando los tiene todos", () => {
    expect(resumenDePermisos({ rol: "colaborador", permisos: [] })).toBe("Solo vender");
    expect(
      resumenDePermisos({
        rol: "colaborador",
        permisos: ["anular_ventas", "movimientos_caja", "cargar_inventario"],
      }),
    ).toBe("Todo");
    expect(resumenDePermisos({ rol: "duenio", permisos: [] })).toBe("Todo");
  });

  it("lista lo que sí puede cuando es una parte", () => {
    expect(resumenDePermisos({ rol: "colaborador", permisos: ["anular_ventas"] })).toBe(
      "Anular ventas y corregir sabores",
    );
  });
});
