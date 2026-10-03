import { describe, expect, it } from "vitest";
import { aSlug } from "./slug";

describe("aSlug", () => {
  it("saca acentos y mayúsculas y une con guiones", () => {
    expect(aSlug("Heladería Los Pinos")).toBe("heladeria-los-pinos");
    expect(aSlug("Goro")).toBe("goro");
  });

  it("una ñ o un símbolo no rompen el nombre del archivo", () => {
    expect(aSlug("Cabaña & Hijos!")).toBe("cabana-hijos");
  });

  it("no deja guiones de más ni al principio ni al final", () => {
    expect(aSlug("  --Dulce   de  leche--  ")).toBe("dulce-de-leche");
  });

  it("si no queda nada usable, un nombre genérico", () => {
    expect(aSlug("¿¡!?")).toBe("comercio");
    expect(aSlug("")).toBe("comercio");
  });
});
