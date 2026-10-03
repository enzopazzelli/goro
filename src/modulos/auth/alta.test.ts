import { describe, expect, it } from "vitest";
import {
  esIdDeUsuario,
  esRol,
  LARGO_MINIMO_CONTRASENA,
  leerEdicion,
  leerPermisos,
  validarContrasena,
  validarNombre,
} from "./alta";

describe("validarNombre", () => {
  it("un nombre de solo espacios no es un nombre", () => {
    expect(validarNombre("   ")).not.toBeNull();
    expect(validarNombre("")).not.toBeNull();
  });

  it("acepta un nombre con espacios y acentos", () => {
    expect(validarNombre("Ana Ruiz")).toBeNull();
    expect(validarNombre("  José  ")).toBeNull();
  });
});

describe("validarContrasena", () => {
  it("rechaza la que no llega al mínimo, y dice cuánto es", () => {
    const corta = "a".repeat(LARGO_MINIMO_CONTRASENA - 1);
    expect(validarContrasena(corta)).toContain(String(LARGO_MINIMO_CONTRASENA));
  });

  it("acepta la que llega justo", () => {
    expect(validarContrasena("a".repeat(LARGO_MINIMO_CONTRASENA))).toBeNull();
  });

  it("no le recorta los espacios: forman parte de la contraseña", () => {
    expect(validarContrasena(" ".repeat(LARGO_MINIMO_CONTRASENA))).toBeNull();
  });
});

describe("esRol", () => {
  it("solo los dos roles que existen", () => {
    expect(esRol("duenio")).toBe(true);
    expect(esRol("colaborador")).toBe(true);
  });

  it("nada que venga torcido de un formulario", () => {
    for (const valor of ["admin", "Duenio", "", null, undefined, 1]) {
      expect(esRol(valor)).toBe(false);
    }
  });
});

describe("leerEdicion", () => {
  const formulario = (campos: Record<string, string>) => {
    const datos = new FormData();
    for (const [nombre, valor] of Object.entries(campos)) datos.set(nombre, valor);
    return datos;
  };
  const valido = {
    id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
    nombre: "  Ana Ruiz ",
    usuario: "Ana Ruiz",
    rol: "colaborador",
  };

  it("devuelve el usuario ya normalizado y el nombre sin espacios de más", () => {
    expect(leerEdicion(formulario(valido))).toEqual({
      id: valido.id,
      nombre: "Ana Ruiz",
      usuario: "ana.ruiz",
      rol: "colaborador",
    });
  });

  it.each([
    ["id torcido", { ...valido, id: "1" }],
    ["nombre vacío", { ...valido, nombre: "  " }],
    ["usuario con correo", { ...valido, usuario: "ana@gmail.com" }],
    ["rol inventado", { ...valido, rol: "admin" }],
  ])("rechaza %s", (_caso, campos) => {
    expect(leerEdicion(formulario(campos))).toHaveProperty("error");
  });
});

describe("esIdDeUsuario", () => {
  it("acepta un uuid", () => {
    expect(esIdDeUsuario("3f2504e0-4f89-41d3-9a0c-0305e82c3301")).toBe(true);
  });

  it("rechaza lo que no lo es", () => {
    for (const valor of ["", "1", "3f2504e0", "3f2504e0-4f89-41d3-9a0c-0305e82c3301; drop"]) {
      expect(esIdDeUsuario(valor)).toBe(false);
    }
  });
});

describe("leerPermisos", () => {
  it("lee los tildados y descarta lo que no es un permiso", () => {
    const datos = new FormData();
    datos.append("permisos", "anular_ventas");
    datos.append("permisos", "borrar_todo");
    datos.append("permisos", "anular_ventas");
    expect(leerPermisos(datos)).toEqual(["anular_ventas"]);
  });

  it("sin nada tildado es una lista vacía, no un error", () => {
    expect(leerPermisos(new FormData())).toEqual([]);
  });
});
