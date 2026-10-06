import { describe, expect, it } from "vitest";
import { leerKgTirado } from "./kgTirado";

describe("leerKgTirado", () => {
  it.each([
    [null, 0],
    ["", 0],
    ["  ", 0],
    ["0", 0],
    ["0.4", 0.4],
    [" 1.25 ", 1.25],
  ])("%j es %d kg", (valor, kg) => {
    expect(leerKgTirado(valor)).toEqual({ kg });
  });

  it.each(["-1", "abc"])("%j no se acepta", (valor) => {
    expect(leerKgTirado(valor)).toHaveProperty("error");
  });
});
