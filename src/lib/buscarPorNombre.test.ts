import { describe, expect, it } from "vitest";
import { coincidencias, pareceCodigo } from "./buscarPorNombre";

const opcion = (nombre: string) => ({ clave: nombre, nombre });
const nombres = (lista: { nombre: string }[]) => lista.map((cada) => cada.nombre);

const OPCIONES = [
  opcion("Palito bombón"),
  opcion("Bombón · ×1"),
  opcion("Bombón · ×12"),
  opcion("Cucurucho"),
  opcion("Galletita"),
];

describe("coincidencias", () => {
  it("no distingue tildes ni mayúsculas", () => {
    expect(nombres(coincidencias(OPCIONES, "BOMBON"))).toContain("Bombón · ×1");
  });

  it("lo que empieza con lo escrito va primero", () => {
    expect(nombres(coincidencias(OPCIONES, "bom"))).toEqual([
      "Bombón · ×1",
      "Bombón · ×12",
      "Palito bombón",
    ]);
  });

  it("cada palabra tiene que estar, en cualquier orden", () => {
    expect(nombres(coincidencias(OPCIONES, "12 bom"))).toEqual(["Bombón · ×12"]);
  });

  it("con menos de dos letras no sugiere nada: con una sola coincide casi todo", () => {
    expect(coincidencias(OPCIONES, "b")).toEqual([]);
    expect(coincidencias(OPCIONES, "  ")).toEqual([]);
  });

  it("no pasa del tope", () => {
    const muchas = Array.from({ length: 10 }, (_, i) => opcion(`Bombón ${i}`));
    expect(coincidencias(muchas, "bombon", 6)).toHaveLength(6);
  });
});

describe("pareceCodigo", () => {
  it.each(["GA0000012", "gp00", "GB1"])("%j parece un código: no se buscan nombres", (texto) => {
    expect(pareceCodigo(texto)).toBe(true);
  });

  it.each(["galletita", "Ga", "bombón"])("%j es un nombre", (texto) => {
    expect(pareceCodigo(texto)).toBe(false);
  });
});
