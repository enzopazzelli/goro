import "server-only";
import { createClient } from "@supabase/supabase-js";
import { urlSupabase } from "./entorno";

/**
 * Cliente con la clave de SERVICIO: se saltea toda la RLS. Existe para una
 * sola cosa: la API de administración de Auth (crear una cuenta, renombrarla,
 * cambiarle la contraseña, borrarla), que no se puede usar con la clave pública.
 *
 * Tres reglas para usarlo:
 * 1. `server-only` arriba: si un componente del navegador lo importa, el build
 *    falla en vez de mandar la clave al cliente.
 * 2. La clave se lee acá y no en `entorno.ts`, que también lo importa el
 *    navegador.
 * 3. Quien lo llama verifica ANTES, contra la base y con la sesión de quien
 *    pide, que es dueño. Con este cliente no hay RLS que frene nada: ese
 *    chequeo es la única barrera.
 *
 * Todo lo que se pueda hacer con la sesión del usuario (editar un perfil, leer)
 * se hace con `clienteServidor()`, no con esto.
 */
export function clienteServicio() {
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!clave) {
    throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY. Va en .env.local y en el hosting.");
  }

  return createClient(urlSupabase(), clave, {
    // Sin sesión propia: no guarda ni refresca nada, solo firma cada pedido.
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
