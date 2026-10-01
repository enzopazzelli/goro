import "server-only";
import { redirect } from "next/navigation";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { Perfil } from "../tipos";

/*
 * La capa que toca el dato. Toda pantalla que necesite saber quién entró pasa
 * por acá y no por el proxy: el proxy hace un chequeo optimista para redirigir
 * rápido, pero la verdad se pregunta acá, contra la base, en cada request.
 */

type Sesion = { tieneSesion: boolean; perfil: Perfil | null };

/**
 * "No tiene sesión" y "tiene sesión pero no perfil activo" son dos casos
 * distintos, y `exigirPerfil` necesita distinguirlos (ver ahí por qué).
 */
async function leerSesion(): Promise<Sesion> {
  const supabase = await clienteServidor();

  // getUser() y no getSession(): getSession lee la cookie sin verificarla
  // contra el servidor de auth, así que se le puede mentir.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { tieneSesion: false, perfil: null };

  // RLS ya limita la fila a la propia; el filtro por id es para pedir una sola.
  const { data } = await supabase
    .from("perfiles")
    .select("id, usuario, nombre, rol, activo")
    .eq("id", user.id)
    .maybeSingle<Perfil>();

  // Un usuario desactivado tiene sesión válida pero no entra.
  return { tieneSesion: true, perfil: data?.activo ? data : null };
}

/** El perfil de quien pidió la página, o `null` si no hay sesión válida. */
export async function perfilActual(): Promise<Perfil | null> {
  return (await leerSesion()).perfil;
}

/**
 * Igual que `perfilActual`, pero saca de la pantalla a quien no tiene perfil.
 *
 * A quien tiene sesión pero ya no perfil activo (lo desactivaron o lo borraron
 * con la sesión abierta) NO se lo manda a `/ingresar`: el proxy ve que tiene
 * sesión y lo devuelve a `/inicio`, y queda en un bucle de redirecciones. Va a
 * `/salir`, que le cierra la sesión primero.
 */
export async function exigirPerfil(): Promise<Perfil> {
  const { tieneSesion, perfil } = await leerSesion();
  if (perfil) return perfil;
  redirect(tieneSesion ? "/salir" : "/ingresar");
}

/** Para las pantallas que son solo del dueño. */
export async function exigirDuenio(): Promise<Perfil> {
  const perfil = await exigirPerfil();
  if (perfil.rol !== "duenio") redirect("/inicio");
  return perfil;
}
