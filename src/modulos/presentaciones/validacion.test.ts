import { describe, expect, it } from "vitest";
import { validarPresentacion } from "./validacion";

const valida = { nombre: "Docena", unidades: 12, precio: 5000, activo: true };

describe("validarPresentacion", () => {
  it("acepta una presentación completa", () => {
    expect(validarPresentacion(valida)).toBeNull();
  });

  it("acepta una presentación inactiva sin precio: así se carga hasta que Goro lo complete", () => {
    expect(validarPresentacion({ ...valida, precio: 0, activo: false })).toBeNull();
  });

  it("rechaza un nombre vacío", () => {
    expect(validarPresentacion({ ...valida, nombre: "" })).toMatch(/nombre/);
  });

  it("rechaza unidades que no son enteros mayores a cero (12,5 · abc · 0 · negativo)", () => {
    for (const unidades of [12.5, Number("abc"), 0, -3]) {
      expect(validarPresentacion({ ...valida, unidades })).toMatch(/unidades/);
    }
  });

  it("rechaza un precio decimal, no numérico o negativo", () => {
    for (const precio of [99.5, Number("abc"), -1]) {
      expect(validarPresentacion({ ...valida, precio })).toMatch(/precio/);
    }
  });

  it("no deja activar una presentación a $0", () => {
    expect(validarPresentacion({ ...valida, precio: 0 })).toMatch(/activarla/);
  });
});
