import "server-only";
import { redirect } from "next/navigation";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { Perfil } from "../tipos";

/*
 * La capa que toca el dato. Toda pantalla que necesite saber quién entró pasa
 * por acá y no por el proxy: el proxy hace un chequeo optimista para redirigir
 * rápido, pero la verdad se pregunta acá, contra la base, en cada request.
 */

/** El perfil de quien pidió la página, o `null` si no hay sesión válida. */
export async function perfilActual(): Promise<Perfil | null> {
  const supabase = await clienteServidor();

  // getUser() y no getSession(): getSession lee la cookie sin verificarla
  // contra el servidor de auth, así que se le puede mentir.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // RLS ya limita la fila a la propia; el filtro por id es para pedir una sola.
  const { data } = await supabase
    .from("perfiles")
    .select("id, usuario, nombre, rol, activo")
    .eq("id", user.id)
    .maybeSingle<Perfil>();

  // Un usuario desactivado tiene sesión válida pero no entra.
  return data?.activo ? data : null;
}

/** Igual que `perfilActual`, pero manda a la pantalla de ingreso si no hay. */
export async function exigirPerfil(): Promise<Perfil> {
  const perfil = await perfilActual();
  if (!perfil) redirect("/ingresar");
  return perfil;
}

/** Para las pantallas que son solo del dueño. */
export async function exigirDuenio(): Promise<Perfil> {
  const perfil = await exigirPerfil();
  if (perfil.rol !== "duenio") redirect("/inicio");
  return perfil;
}
