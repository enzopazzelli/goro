"use server";

import { revalidatePath } from "next/cache";
import { clienteServicio } from "@/lib/supabase/servicio";
import { clienteServidor } from "@/lib/supabase/servidor";
import { esIdDeUsuario } from "../alta";
import { duenioQuePide, mensajeDeAuth, SOLO_DUENIO, type EstadoUsuario } from "./administracion";

/** Activar o desactivar. Con la sesión del dueño: el trigger de perfiles cuida que no se quede sin dueños. */
export async function cambiarActivo(
  _previo: EstadoUsuario,
  datos: FormData,
): Promise<EstadoUsuario> {
  const yo = await duenioQuePide();
  if (!yo) return { error: SOLO_DUENIO };

  const id = String(datos.get("id") ?? "");
  const activo = datos.get("activo") === "true";
  if (!esIdDeUsuario(id)) return { error: "Usuario inválido." };
  if (id === yo.id) return { error: "No podés desactivarte a vos mismo." };

  const supabase = await clienteServidor();
  const { error } = await supabase.from("perfiles").update({ activo }).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/usuarios");
  return { error: null };
}

/**
 * "Borrar" hace una de dos cosas, y dice cuál:
 * - Sin historial (se creó mal, nunca vendió): se borra la cuenta y desaparece.
 * - Con historial: no se puede ir, porque sus ventas y movimientos tienen que
 *   seguir diciendo quién los hizo. Se desactiva y ya no puede entrar.
 *
 * Se le pregunta a la base ANTES en vez de intentar el borrado y leer el error:
 * Auth devuelve un "Database error" genérico que no distingue una clave foránea
 * de una caída. Si entre la pregunta y el borrado el usuario hace su primera
 * venta, la clave foránea frena el borrado igual y el segundo intento desactiva.
 */
export async function borrarUsuario(
  _previo: EstadoUsuario,
  datos: FormData,
): Promise<EstadoUsuario> {
  const yo = await duenioQuePide();
  if (!yo) return { error: SOLO_DUENIO };

  const id = String(datos.get("id") ?? "");
  if (!esIdDeUsuario(id)) return { error: "Usuario inválido." };
  if (id === yo.id) return { error: "No podés borrarte a vos mismo." };

  const supabase = await clienteServidor();
  const { data: tieneHistorial, error: errorHistorial } = await supabase.rpc(
    "perfil_tiene_historial",
    { p_perfil_id: id },
  );
  // Acá cae, por ejemplo, "Tiene que quedar al menos un dueño activo."
  if (errorHistorial) return { error: errorHistorial.message };

  if (tieneHistorial) {
    const { error } = await supabase.from("perfiles").update({ activo: false }).eq("id", id);
    if (error) return { error: error.message };

    revalidatePath("/usuarios");
    return {
      error: null,
      aviso:
        "Ese usuario ya tiene ventas o movimientos, así que no se borró: quedó desactivado y ya no puede entrar.",
    };
  }

  const { error } = await clienteServicio().auth.admin.deleteUser(id);
  if (error) return { error: mensajeDeAuth(error) };

  revalidatePath("/usuarios");
  return { error: null, aviso: "Usuario borrado." };
}
