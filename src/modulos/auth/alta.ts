import { esPermiso, type Permiso } from "./permisos";
import type { Rol } from "./tipos";
import { normalizarUsuario, validarUsuario } from "./usuario";

/*
 * Validaciones del alta y la edición de usuarios. Son comodidad de UX: dicen
 * el problema antes de ir al servidor. Las barreras reales están en la base
 * (el `check` del nombre, los triggers de perfiles) y en Supabase Auth.
 */

/**
 * El mínimo de verdad lo fija la configuración de Supabase Auth, no una
 * columna: es la única validación de este módulo que no tiene su `check`. Si
 * allá se pide más, Auth rechaza y se muestra su mensaje.
 */
export const LARGO_MINIMO_CONTRASENA = 8;

/** `null` si sirve; si no, el motivo, escrito para mostrarlo tal cual. */
export function validarNombre(valor: string): string | null {
  return valor.trim() === "" ? "Escribí el nombre." : null;
}

export function validarContrasena(valor: string): string | null {
  if (valor.length < LARGO_MINIMO_CONTRASENA) {
    return `La contraseña necesita al menos ${LARGO_MINIMO_CONTRASENA} caracteres.`;
  }
  return null;
}

export function esRol(valor: unknown): valor is Rol {
  return valor === "duenio" || valor === "colaborador";
}

export type Edicion = { id: string; nombre: string; usuario: string; rol: Rol };

/**
 * Lee y valida el formulario de edición. El usuario vuelve ya normalizado
 * ("Ana Ruiz" → "ana.ruiz"), que es como se guarda y como se compara con el
 * actual para saber si hay que renombrar la cuenta.
 */
export function leerEdicion(datos: FormData): Edicion | { error: string } {
  const id = String(datos.get("id") ?? "");
  const nombre = String(datos.get("nombre") ?? "").trim();
  const usuario = String(datos.get("usuario") ?? "");
  const rol = datos.get("rol");

  if (!esIdDeUsuario(id)) return { error: "Usuario inválido." };
  const problema = validarNombre(nombre) ?? validarUsuario(usuario);
  if (problema) return { error: problema };
  if (!esRol(rol)) return { error: "Elegí un rol." };

  return { id, nombre, usuario: normalizarUsuario(usuario), rol };
}

const FORMA_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** El id de un usuario llega de un campo oculto del formulario: se revisa antes de mandarlo a ningún lado. */
export function esIdDeUsuario(valor: string): boolean {
  return FORMA_UUID.test(valor);
}

/**
 * Los permisos tildados en el formulario. Lo que no está en la lista fija se
 * descarta en silencio: un campo inventado a mano no llega a la base. Una lista
 * vacía es válida y quiere decir "solo vender".
 */
export function leerPermisos(datos: FormData): Permiso[] {
  const tildados = datos.getAll("permisos").map(String).filter(esPermiso);
  return [...new Set(tildados)];
}
