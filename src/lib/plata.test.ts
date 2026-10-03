import { describe, expect, it } from "vitest";
import { formatearMiles, formatearPlata } from "./plata";

describe("formatearPlata", () => {
  it("separa miles con punto", () => {
    expect(formatearPlata(45000)).toBe("$45.000");
    expect(formatearPlata(1234567)).toBe("$1.234.567");
  });

  it("también en los números de cuatro cifras, que son casi todos los precios", () => {
    expect(formatearPlata(3000)).toBe("$3.000");
    expect(formatearMiles(1234)).toBe("1.234");
  });

  it("cero y montos chicos", () => {
    expect(formatearPlata(0)).toBe("$0");
    expect(formatearPlata(500)).toBe("$500");
  });

  it("un negativo lleva el menos adelante del signo pesos", () => {
    expect(formatearPlata(-3500)).toBe("−$3.500");
  });
});
