import { describe, expect, it } from "vitest";
import { DOMINIO_INTERNO } from "@/config/comercio";
import { correoDesdeUsuario, FORMA_USUARIO, normalizarUsuario, validarUsuario } from "./usuario";

describe("normalizarUsuario", () => {
  it.each([
    ["ana", "ana"],
    ["  Ana  ", "ana"],
    ["Gustavo Ordóñez", "gustavo.ordonez"],
    ["María José", "maria.jose"],
    ["lucas_f", "lucas_f"],
  ])("%s → %s", (entrada, esperado) => {
    expect(normalizarUsuario(entrada)).toBe(esperado);
  });

  it("saca todo lo que la columna no aceptaría", () => {
    // Si esto dejara pasar algo, el insert reventaría contra el check de la
    // base en vez de avisar en el formulario.
    const sucio = "Añ@ Ruiz!! #1 <script>";
    expect(normalizarUsuario(sucio)).toMatch(FORMA_USUARIO);
  });
});

describe("correoDesdeUsuario", () => {
  // Contra la constante y no contra el literal: el dominio es configurable,
  // lo que el test fija es la forma, no el valor.
  it("le pega el dominio interno", () => {
    expect(correoDesdeUsuario("ana")).toBe(`ana@${DOMINIO_INTERNO}`);
  });

  it("normaliza antes de armarlo", () => {
    expect(correoDesdeUsuario(" Gustavo Ordóñez ")).toBe(`gustavo.ordonez@${DOMINIO_INTERNO}`);
  });

  it("el dominio no lleva el nombre del comercio", () => {
    // Queda grabado en cada fila de auth.users: si llevara el nombre, el día
    // que la heladería se llame distinto habría que migrar todas las cuentas.
    expect(DOMINIO_INTERNO).toMatch(/\.local$/);
    expect(DOMINIO_INTERNO.toLowerCase()).not.toContain("goro");
  });
});

describe("validarUsuario", () => {
  it.each(["ana", "lucas", "gustavo.ordonez", "marina_c"])("acepta %s", (valor) => {
    expect(validarUsuario(valor)).toBeNull();
  });

  it("rechaza un correo, para que nadie cargue ana@gmail.com como usuario", () => {
    // Sin esto el correo interno quedaría "anagmail.com@goro.local".
    expect(validarUsuario("ana@gmail.com")).toMatch(/sin @/);
  });

  it("rechaza vacío y demasiado corto", () => {
    expect(validarUsuario("   ")).toMatch(/Escribí/);
    expect(validarUsuario("an")).toMatch(/al menos 3/);
  });

  it("rechaza lo que se pasa de largo", () => {
    expect(validarUsuario("a".repeat(33))).toMatch(/no puede pasar/);
  });

  it("cuenta el largo después de normalizar, no antes", () => {
    // "A ñ" se normaliza a "a.n": tres caracteres, válido.
    expect(validarUsuario("A ñ")).toBeNull();
  });
});
