import { afterEach, describe, expect, it, vi } from "vitest";
import { esClaveValida, nuevaClave } from "./claveUnica";

describe("nuevaClave", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("devuelve un UUID válido y distinto cada vez", () => {
    const a = nuevaClave();
    const b = nuevaClave();
    expect(esClaveValida(a)).toBe(true);
    expect(a).not.toBe(b);
  });

  it("sigue funcionando donde no existe randomUUID (http en la red local)", () => {
    vi.stubGlobal("crypto", { getRandomValues: crypto.getRandomValues.bind(crypto) });

    const clave = nuevaClave();
    expect(esClaveValida(clave)).toBe(true);
    // Versión 4 y variante 10xx: lo que exige la columna uuid de Postgres.
    expect(clave[14]).toBe("4");
    expect("89ab").toContain(clave[19]);
  });
});

describe("esClaveValida", () => {
  it("rechaza lo que no es un UUID", () => {
    expect(esClaveValida("")).toBe(false);
    expect(esClaveValida("hola")).toBe(false);
    expect(esClaveValida("123e4567-e89b-12d3-a456-42661417400")).toBe(false);
  });
});
