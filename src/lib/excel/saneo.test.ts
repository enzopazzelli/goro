import { describe, expect, it } from "vitest";
import { sanearTexto } from "./saneo";

describe("sanearTexto", () => {
  it("le antepone una comilla a lo que Excel leería como fórmula", () => {
    expect(sanearTexto("=SUMA(A1:A9)")).toBe("'=SUMA(A1:A9)");
    expect(sanearTexto("+54911")).toBe("'+54911");
    expect(sanearTexto("-cmd|' /C calc'!A0")).toBe("'-cmd|' /C calc'!A0");
    expect(sanearTexto("@SUM(1+1)")).toBe("'@SUM(1+1)");
    expect(sanearTexto("\t=1+1")).toBe("'\t=1+1");
    expect(sanearTexto("\r=1+1")).toBe("'\r=1+1");
  });

  it("deja igual todo lo demás", () => {
    expect(sanearTexto("Frutilla a la crema")).toBe("Frutilla a la crema");
    expect(sanearTexto("Gasto: = servilletas")).toBe("Gasto: = servilletas");
    expect(sanearTexto("")).toBe("");
  });
});
