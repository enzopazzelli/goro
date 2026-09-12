/*
 * Acá se entra con usuario y contraseña, nunca con un correo: en el mostrador
 * nadie tiene ni quiere una casilla, y "ana" se tipea más rápido que
 * "ana@loquesea" con las manos ocupadas.
 *
 * Supabase Auth exige un email para crear una cuenta, así que se le arma uno
 * interno a partir del usuario (`ana` → `ana@heladeria.local`). Ese correo no
 * existe, nadie lo lee y no se muestra en ninguna pantalla: es solo la
 * identidad que Auth pide.
 *
 * El usuario visible se guarda como columna en `perfiles`, no se deduce
 * recortándole el dominio al correo. Es lo que evita tener que mantener una
 * lista de dominios falsos para saber qué mostrar.
 */

import { DOMINIO_INTERNO } from "@/config/comercio";

export const LARGO_MINIMO = 3;
export const LARGO_MAXIMO = 32;

/** Misma regla que el `check` de la columna `perfiles.usuario`. */
export const FORMA_USUARIO = /^[a-z0-9._-]+$/;

/**
 * Deja el usuario en algo que sirva como parte local de un correo: minúsculas,
 * sin acentos, los espacios a punto, y sin ningún carácter que Auth rechace.
 */
export function normalizarUsuario(valor: string): string {
  return valor
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9._-]/g, "");
}

/** El correo interno con el que se crea y se busca la cuenta. */
export function correoDesdeUsuario(usuario: string): string {
  return `${normalizarUsuario(usuario)}@${DOMINIO_INTERNO}`;
}

/** `null` si sirve; si no, el motivo, escrito para mostrarlo tal cual. */
export function validarUsuario(valor: string): string | null {
  if (valor.includes("@")) return "Poné solo el usuario, sin @ ni correo.";

  const normalizado = normalizarUsuario(valor);
  if (normalizado === "") return "Escribí un usuario.";
  if (normalizado.length < LARGO_MINIMO) {
    return `El usuario necesita al menos ${LARGO_MINIMO} caracteres.`;
  }
  if (normalizado.length > LARGO_MAXIMO) {
    return `El usuario no puede pasar de ${LARGO_MAXIMO} caracteres.`;
  }
  return null;
}
