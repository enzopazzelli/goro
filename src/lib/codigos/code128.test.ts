import { describe, expect, it } from "vitest";
import { anchoEnModulos, barrasDe, soloParaTests, valoresDe, ZONA_MUDA } from "./code128";

const { PATRONES, modulosDe, ARRANQUE_B, PARADA } = soloParaTests;

/*
 * El riesgo real de este archivo no es la lógica —son treinta líneas— sino
 * un dígito mal tipeado en la tabla de patrones. Un error ahí no rompe nada:
 * genera un código que se dibuja perfecto y que ninguna pistola lee.
 *
 * Estos tests atacan exactamente eso, con invariantes que la norma garantiza.
 * Lo que NO pueden probar es que la tabla sea la tabla correcta de la norma:
 * eso lo prueba una pistola contra papel impreso (paso 0.2 del ROADMAP).
 */
describe("tabla de patrones", () => {
  it("tiene los 107 patrones: 103 de datos, 3 de arranque y el de parada", () => {
    expect(PATRONES).toHaveLength(107);
  });

  it("cada patrón de datos mide 11 módulos en 6 elementos", () => {
    const datos = PATRONES.slice(0, PARADA);
    for (const p of datos) {
      expect(p).toHaveLength(6);
      expect([...p].reduce((total, ancho) => total + +ancho, 0)).toBe(11);
    }
  });

  it("el patrón de parada mide 13 módulos en 7 elementos", () => {
    const parada = PATRONES[PARADA] ?? "";
    expect(parada).toHaveLength(7);
    expect([...parada].reduce((total, ancho) => total + +ancho, 0)).toBe(13);
  });

  it("no hay dos patrones iguales", () => {
    // Si dos valores compartieran patrón, el símbolo sería ambiguo y el
    // lector podría devolver un carácter por otro.
    expect(new Set(PATRONES).size).toBe(PATRONES.length);
  });
});

describe("valoresDe", () => {
  it("arranca con START B y termina con STOP", () => {
    const valores = valoresDe("GP0000123");
    expect(valores.at(0)).toBe(ARRANQUE_B);
    expect(valores.at(-1)).toBe(PARADA);
  });

  it("calcula el verificador como suma ponderada módulo 103", () => {
    // "AB": A=33, B=34. Suma = 104 + 33*1 + 34*2 = 205. 205 % 103 = 102.
    expect(valoresDe("AB")).toEqual([104, 33, 34, 102, 106]);
  });

  it("rechaza lo que el subconjunto B no puede codificar", () => {
    expect(() => valoresDe("café")).toThrow(/no puede codificar/);
  });
});

describe("barrasDe", () => {
  it("empieza y termina en barra, con la zona muda a cada lado", () => {
    const barras = barrasDe("GP0000123");
    const primera = barras.at(0);
    const ultima = barras.at(-1);

    expect(primera?.x).toBe(ZONA_MUDA);
    expect(ultima).toBeDefined();
    // La parada termina en barra: el dibujo llega hasta el borde de la zona
    // muda derecha, sin espacio colgando.
    expect(ultima!.x + ultima!.ancho).toBe(anchoEnModulos("GP0000123") - ZONA_MUDA);
  });

  it("agrupa módulos contiguos en un solo rectángulo", () => {
    const modulos = modulosDe("GP0000123");
    const barras = barrasDe("GP0000123");
    const modulosNegros = [...modulos].filter((m) => m === "1").length;

    expect(barras.reduce((total, b) => total + b.ancho, 0)).toBe(modulosNegros);
    // Agrupadas de verdad: hay menos rectángulos que módulos negros.
    expect(barras.length).toBeLessThan(modulosNegros);
  });
});

describe("ida y vuelta", () => {
  /* Decodifica leyendo los anchos de a 6 elementos y buscándolos en la tabla.
     Si el codificador y la tabla son consistentes, vuelve el texto original.
     Es lo más cerca que se puede estar de "esto se lee" sin una pistola. */
  function decodificar(modulos: string): string {
    const anchos: number[] = [];
    for (let i = 0; i < modulos.length;) {
      let fin = i;
      while (fin < modulos.length && modulos[fin] === modulos[i]) fin++;
      anchos.push(fin - i);
      i = fin;
    }

    // La parada son los últimos 7 elementos; el resto son grupos parejos de 6.
    const cuerpo = anchos.slice(0, -7);
    const valores: number[] = [];
    for (let i = 0; i + 6 <= cuerpo.length; i += 6) {
      valores.push(PATRONES.indexOf(cuerpo.slice(i, i + 6).join("")));
    }

    expect(valores).not.toContain(-1);

    // Se descartan el arranque y el verificador: quedan los datos.
    return valores
      .slice(1, -1)
      .map((valor) => String.fromCharCode(valor + 32))
      .join("");
  }

  it.each(["GP0000123", "GA0000014", "GC0009998", "Goro 1/2 kg"])(
    "recupera %s después de codificarlo",
    (texto) => {
      expect(decodificar(modulosDe(texto))).toBe(texto);
    },
  );
});
