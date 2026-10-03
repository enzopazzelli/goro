"use server";

import { revalidatePath } from "next/cache";
import { clienteServicio } from "@/lib/supabase/servicio";
import { clienteServidor } from "@/lib/supabase/servidor";
import {
  esIdDeUsuario,
  esRol,
  leerEdicion,
  leerPermisos,
  validarContrasena,
  validarNombre,
} from "../alta";
import { correoDesdeUsuario, normalizarUsuario, validarUsuario } from "../usuario";
import type { Rol } from "../tipos";
import { duenioQuePide, mensajeDeAuth, SOLO_DUENIO, type EstadoUsuario } from "./administracion";

/*
 * Alta y edición de usuarios. La clave de servicio se usa SOLO para la cuenta
 * de Auth; todo lo que es del perfil (nombre, rol) va con la sesión del dueño,
 * así sigue pasando por la RLS y por los triggers de perfiles.
 */

export async function crearUsuario(
  _previo: EstadoUsuario,
  datos: FormData,
): Promise<EstadoUsuario> {
  if (!(await duenioQuePide())) return { error: SOLO_DUENIO };

  const nombre = String(datos.get("nombre") ?? "").trim();
  const usuario = String(datos.get("usuario") ?? "");
  const contrasena = String(datos.get("contrasena") ?? "");
  const rol = datos.get("rol");

  const problema =
    validarNombre(nombre) ?? validarUsuario(usuario) ?? validarContrasena(contrasena);
  if (problema) return { error: problema };
  if (!esRol(rol)) return { error: "Elegí un rol." };

  const { data, error } = await clienteServicio().auth.admin.createUser({
    email: correoDesdeUsuario(usuario),
    password: contrasena,
    // Sin esto la cuenta queda esperando un mail de confirmación que nunca va
    // a llegar: el dominio interno no existe.
    email_confirm: true,
    user_metadata: { nombre },
  });
  if (error) return { error: mensajeDeAuth(error) };

  revalidatePath("/usuarios");

  const problemaDelPerfil = await completarPerfil(data.user.id, rol, datos);
  if (problemaDelPerfil) return { error: problemaDelPerfil };

  return { error: null, aviso: `Se creó el usuario ${normalizarUsuario(usuario)}.` };
}

export async function editarUsuario(
  _previo: EstadoUsuario,
  datos: FormData,
): Promise<EstadoUsuario> {
  const yo = await duenioQuePide();
  if (!yo) return { error: SOLO_DUENIO };

  const edicion = leerEdicion(datos);
  if ("error" in edicion) return edicion;
  const { id, nombre, usuario, rol } = edicion;

  const supabase = await clienteServidor();
  const { data: actual } = await supabase
    .from("perfiles")
    .select("usuario")
    .eq("id", id)
    .maybeSingle();
  if (!actual) return { error: "Ese usuario ya no existe." };

  // Va primero: es lo único que puede chocar con otro usuario, y si falla no
  // se tocó nada.
  if (usuario !== actual.usuario) {
    const problema = await renombrarCuenta(id, usuario);
    if (problema) return { error: problema };
  }

  // El rol propio no se manda: el trigger lo rechaza, y así editar el propio
  // nombre no falla por un rol que ni cambió.
  // Los permisos solo se guardan para un colaborador: el dueño puede todo y su
  // lista no se usa.
  const cambios =
    id === yo.id
      ? { nombre }
      : rol === "colaborador"
        ? { nombre, rol, permisos: leerPermisos(datos) }
        : { nombre, rol };
  const { error } = await supabase.from("perfiles").update(cambios).eq("id", id);

  revalidatePath("/usuarios");
  // Los mensajes de los triggers ya están escritos para mostrarse tal cual.
  if (error) return { error: error.message };
  return { error: null, aviso: `Se guardaron los cambios de ${usuario}.` };
}

/**
 * Renombrar es cambiar el correo interno de Auth; el trigger de la base copia
 * el usuario al perfil en la misma transacción, así que se escribe en un solo
 * lugar. Devuelve el problema, o `null` si salió bien.
 */
async function renombrarCuenta(id: string, usuario: string): Promise<string | null> {
  const { error } = await clienteServicio().auth.admin.updateUserById(id, {
    email: correoDesdeUsuario(usuario),
    email_confirm: true,
  });
  return error ? mensajeDeAuth(error) : null;
}

/** La contraseña la pone y la cambia el dueño: los correos son internos y no hay recuperación por mail. */
export async function cambiarContrasena(
  _previo: EstadoUsuario,
  datos: FormData,
): Promise<EstadoUsuario> {
  if (!(await duenioQuePide())) return { error: SOLO_DUENIO };

  const id = String(datos.get("id") ?? "");
  const contrasena = String(datos.get("contrasena") ?? "");
  if (!esIdDeUsuario(id)) return { error: "Usuario inválido." };
  const problema = validarContrasena(contrasena);
  if (problema) return { error: problema };

  const { error } = await clienteServicio().auth.admin.updateUserById(id, {
    password: contrasena,
  });
  if (error) return { error: mensajeDeAuth(error) };

  return { error: null, aviso: "Contraseña cambiada." };
}

/**
 * El trigger crea el perfil SIEMPRE como colaborador y con todos los permisos
 * (el rol nunca se lee de los metadatos). Promoverlo, o quitarle permisos, es un
 * update del dueño, por RLS. Devuelve el problema, o `null` si salió bien.
 */
async function completarPerfil(id: string, rol: Rol, datos: FormData): Promise<string | null> {
  const supabase = await clienteServidor();

  if (rol === "duenio") {
    const { error } = await supabase.from("perfiles").update({ rol }).eq("id", id);
    return error
      ? "El usuario se creó como colaborador, pero no se pudo hacerlo dueño. Cambiale el rol desde Editar."
      : null;
  }

  const { error } = await supabase
    .from("perfiles")
    .update({ permisos: leerPermisos(datos) })
    .eq("id", id);
  return error
    ? "El usuario se creó, pero no se pudieron guardar sus permisos. Revisalos desde Editar."
    : null;
}
