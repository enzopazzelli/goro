import { describe, expect, it } from "vitest";
import type { Balde } from "./baldes";
import { kgPorSabor } from "./kgPorSabor";

function balde(parcial: Partial<Balde>): Balde {
  return {
    id: 1,
    codigo: "GB0000001",
    saborId: 1,
    kgInicial: 10,
    kgRestante: 10,
    estado: "cerrado",
    costo: 1000,
    costoEnvase: 500,
    ...parcial,
  };
}

describe("kgPorSabor", () => {
  it("da un objeto vacío sin baldes", () => {
    expect(kgPorSabor([])).toEqual({});
  });

  it("suma un solo balde", () => {
    expect(kgPorSabor([balde({ saborId: 1, kgRestante: 4 })])).toEqual({ 1: 4 });
  });

  it("suma varios baldes del mismo sabor", () => {
    const baldes = [
      balde({ id: 1, saborId: 1, kgRestante: 4 }),
      balde({ id: 2, saborId: 1, kgRestante: 3 }),
    ];
    expect(kgPorSabor(baldes)).toEqual({ 1: 7 });
  });

  it("separa sabores distintos", () => {
    const baldes = [
      balde({ id: 1, saborId: 1, kgRestante: 4 }),
      balde({ id: 2, saborId: 2, kgRestante: 5 }),
    ];
    expect(kgPorSabor(baldes)).toEqual({ 1: 4, 2: 5 });
  });
});
