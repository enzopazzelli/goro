import { describe, expect, it } from "vitest";
import { estadoDeInsumo, saborEnAlerta } from "./alerta";

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

describe("estadoDeInsumo", () => {
  it("un stock negativo se distingue de uno bajo: el conteo no cierra", () => {
    expect(estadoDeInsumo(-4, 0)).toBe("negativo");
  });

  it("bajo el mínimo, o justo en el mínimo, pide reponer", () => {
    expect(estadoDeInsumo(3, 5)).toBe("bajo");
    expect(estadoDeInsumo(5, 5)).toBe("bajo");
  });

  it("por encima del mínimo está bien", () => {
    expect(estadoDeInsumo(6, 5)).toBe("ok");
  });

  it("cero con mínimo cero pide reponer pero no es negativo", () => {
    expect(estadoDeInsumo(0, 0)).toBe("bajo");
  });
});
