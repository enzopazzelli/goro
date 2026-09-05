import { describe, expect, it } from "vitest";
import { digitoVerificador, generarCodigo, leerCodigo } from "./codigo";

describe("generarCodigo", () => {
  it("arma un código de 9 caracteres con prefijo, tipo, secuencia y verificador", () => {
    const codigo = generarCodigo("P", 123);
    expect(codigo).toHaveLength(9);
    expect(codigo.startsWith("GP000123")).toBe(true);
  });

  it("rellena la secuencia con ceros a la izquierda", () => {
    expect(generarCodigo("A", 1)).toMatch(/^GA000001\d$/);
  });

  it("rechaza secuencias fuera de rango", () => {
    expect(() => generarCodigo("P", 0)).toThrow(/fuera de rango/);
    expect(() => generarCodigo("P", 1_000_000)).toThrow(/fuera de rango/);
    expect(() => generarCodigo("P", 1.5)).toThrow(/fuera de rango/);
  });
});

describe("leerCodigo", () => {
  it("lee de vuelta lo que generó, para los tres tipos", () => {
    for (const tipo of ["A", "P", "C"] as const) {
      for (const secuencia of [1, 42, 999_999]) {
        expect(leerCodigo(generarCodigo(tipo, secuencia))).toEqual({ tipo, secuencia });
      }
    }
  });

  it("tolera lo que agrega el mundo real: espacios y minúsculas", () => {
    const codigo = generarCodigo("P", 77);
    expect(leerCodigo(`  ${codigo.toLowerCase()}\n`)).toEqual({ tipo: "P", secuencia: 77 });
  });

  it("devuelve null en vez de explotar con lo que no es un código propio", () => {
    // El mostrador escanea cualquier cosa: un EAN de un proveedor, una
    // etiqueta de otro comercio, o basura. Nada de eso es un error.
    for (const basura of ["", "hola", "7791234567890", "GP000123", "XP0001234"]) {
      expect(leerCodigo(basura)).toBeNull();
    }
  });

  it("rechaza un código con un dígito cambiado", () => {
    // Es para lo que existe el verificador: que un código tipeado a mano con
    // un error no entre como si fuera otro producto real.
    const codigo = generarCodigo("P", 1234);
    const roto = codigo.slice(0, 4) + ((+codigo[4]! + 1) % 10) + codigo.slice(5);
    expect(leerCodigo(roto)).toBeNull();
  });

  it("rechaza el mismo número con el tipo cambiado", () => {
    // El tipo entra al verificador justamente para esto.
    const codigo = generarCodigo("P", 500);
    expect(leerCodigo("GA" + codigo.slice(2))).toBeNull();
  });
});

describe("digitoVerificador", () => {
  it("es un dígito", () => {
    for (let secuencia = 1; secuencia <= 300; secuencia++) {
      const digito = digitoVerificador("P", secuencia);
      expect(digito).toBeGreaterThanOrEqual(0);
      expect(digito).toBeLessThanOrEqual(9);
    }
  });

  it("cambia si cambia el tipo", () => {
    expect(digitoVerificador("A", 1)).not.toBe(digitoVerificador("P", 1));
  });
});
