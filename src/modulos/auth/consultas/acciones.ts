"use server";

import { redirect } from "next/navigation";
import { clienteServidor } from "@/lib/supabase/servidor";
import { correoDesdeUsuario, validarUsuario } from "../usuario";

export type EstadoIngreso = { error: string | null };

/**
 * Ingreso con usuario y contraseña. El correo interno se arma acá; quien
 * atiende nunca ve ni escribe una dirección.
 *
 * Cuando las credenciales no sirven el mensaje es siempre el mismo, sea que el
 * usuario no existe o que la contraseña está mal: distinguirlos le confirma a
 * cualquiera qué usuarios tienen cuenta.
 */
export async function ingresar(_previo: EstadoIngreso, datos: FormData): Promise<EstadoIngreso> {
  const usuario = String(datos.get("usuario") ?? "");
  const contrasena = String(datos.get("contrasena") ?? "");

  const problema = validarUsuario(usuario);
  if (problema) return { error: problema };
  if (!contrasena) return { error: "Escribí la contraseña." };

  const supabase = await clienteServidor();
  const { error } = await supabase.auth.signInWithPassword({
    email: correoDesdeUsuario(usuario),
    password: contrasena,
  });

  if (error) return { error: "Usuario o contraseña incorrectos." };

  redirect("/inicio");
}

export async function salir(): Promise<void> {
  const supabase = await clienteServidor();
  await supabase.auth.signOut();
  redirect("/ingresar");
}
