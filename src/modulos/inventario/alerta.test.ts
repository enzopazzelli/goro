import { describe, expect, it } from "vitest";
import { saborEnAlerta } from "./alerta";

describe("saborEnAlerta", () => {
  it("alerta si no hay ningún balde abierto", () => {
    expect(saborEnAlerta({ stockMinimo: null }, null, 2.5)).toBe(true);
  });

  it("no alerta si el balde abierto tiene más que el mínimo por defecto", () => {
    expect(saborEnAlerta({ stockMinimo: null }, { kgRestante: 9 }, 2.5)).toBe(false);
  });

  it("alerta si el balde abierto bajó del mínimo por defecto", () => {
    expect(saborEnAlerta({ stockMinimo: null }, { kgRestante: 2 }, 2.5)).toBe(true);
  });

  it("usa el override del sabor en vez del default", () => {
    // Frutilla pide que avisen antes: un mínimo más alto que el default.
    expect(saborEnAlerta({ stockMinimo: 6 }, { kgRestante: 7 }, 2.5)).toBe(false);
    expect(saborEnAlerta({ stockMinimo: 6 }, { kgRestante: 5 }, 2.5)).toBe(true);
  });

  it("alerta justo en el límite, no solo por debajo", () => {
    expect(saborEnAlerta({ stockMinimo: null }, { kgRestante: 2.5 }, 2.5)).toBe(true);
  });
});
