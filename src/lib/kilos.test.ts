import { describe, expect, it } from "vitest";
import { formatearKilos } from "./kilos";

describe("formatearKilos", () => {
  it("usa coma decimal, no punto", () => {
    expect(formatearKilos(1.5)).toBe("1,5 kg");
  });

  it("redondea a un decimal: el gramo no le importa a nadie acá", () => {
    expect(formatearKilos(0.249)).toBe("0,2 kg");
  });

  it("un entero no muestra decimales de relleno", () => {
    expect(formatearKilos(12)).toBe("12 kg");
  });
});
