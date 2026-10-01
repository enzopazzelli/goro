import "server-only";
import type { Perfil } from "../tipos";
import { perfilActual } from "./perfil";

/** Lo que devuelven las acciones de Usuarios. `aviso` es el resultado para mostrar ("se borró", "quedó desactivado"). */
export type EstadoUsuario = { error: string | null; aviso?: string };

export const SOLO_DUENIO = "Solo el dueño administra usuarios.";

/**
 * LA barrera de las acciones de Usuarios. Varias usan la clave de servicio, que
 * se saltea la RLS: lo único que impide que un colaborador cree un dueño
 * llamando la acción a mano es este chequeo, hecho contra la base y con la
 * sesión de quien pide. Devuelve `null` si no es dueño (o no hay sesión, o está
 * desactivado): nunca se compara un rol que puede venir vacío.
 */
export async function duenioQuePide(): Promise<Perfil | null> {
  const perfil = await perfilActual();
  return perfil?.rol === "duenio" ? perfil : null;
}

/**
 * Los errores de Auth llegan en inglés y a veces con detalle interno. Se
 * traducen los que la persona puede resolver; el resto se registra en el
 * servidor y se muestra un mensaje genérico.
 */
export function mensajeDeAuth(error: { code?: string; message: string }): string {
  switch (error.code) {
    case "email_exists":
    case "user_already_exists":
      return "Ya existe un usuario con ese nombre de ingreso.";
    case "weak_password":
      return "La contraseña es muy débil para el sistema. Probá una más larga.";
    case "user_not_found":
      return "Ese usuario ya no existe.";
    default:
      console.error("Auth admin:", error.code, error.message);
      return "No se pudo completar el cambio en la cuenta. Probá de nuevo.";
  }
}
