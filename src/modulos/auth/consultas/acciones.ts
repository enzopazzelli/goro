"use server";

import { redirect } from "next/navigation";
import { clienteServidor } from "@/lib/supabase/servidor";
import { correoDesdeUsuario, validarUsuario } from "../usuario";

export type EstadoIngreso = { error: string | null };

const CREDENCIALES_INCORRECTAS = "Usuario o contraseña incorrectos.";

/**
 * Ingreso con usuario y contraseña. El correo interno se arma acá; quien
 * atiende nunca ve ni escribe una dirección.
 *
 * Cuando las credenciales no sirven el mensaje es siempre el mismo, sea que el
 * usuario no existe, que la contraseña está mal o que lo desactivaron:
 * distinguirlos le confirma a cualquiera qué usuarios tienen cuenta.
 */
export async function ingresar(_previo: EstadoIngreso, datos: FormData): Promise<EstadoIngreso> {
  const usuario = String(datos.get("usuario") ?? "");
  const contrasena = String(datos.get("contrasena") ?? "");

  const problema = validarUsuario(usuario);
  if (problema) return { error: problema };
  if (!contrasena) return { error: "Escribí la contraseña." };

  const supabase = await clienteServidor();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: correoDesdeUsuario(usuario),
    password: contrasena,
  });

  if (error) return { error: CREDENCIALES_INCORRECTAS };

  // Desactivar a alguien no le borra la cuenta de Auth: la contraseña sigue
  // sirviendo. Acá se lo frena, y se le cierra la sesión recién abierta para
  // que no quede con una cookie válida y sin perfil (ver exigirPerfil).
  const { data: perfil } = await supabase
    .from("perfiles")
    .select("activo")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!perfil?.activo) {
    await supabase.auth.signOut();
    return { error: CREDENCIALES_INCORRECTAS };
  }

  redirect("/inicio");
}

export async function salir(): Promise<void> {
  const supabase = await clienteServidor();
  await supabase.auth.signOut();
  redirect("/ingresar");
}
