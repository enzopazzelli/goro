import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { clavePublica, urlSupabase } from "./entorno";

/**
 * Cliente para Server Components, Server Actions y Route Handlers.
 *
 * Usa la clave pública, no la de servicio: todo lo que haga pasa por RLS igual
 * que si lo pidiera el navegador. La barrera de seguridad es Postgres, no el
 * hecho de estar corriendo del lado del servidor.
 */
export async function clienteServidor() {
  const galletas = await cookies();

  return createServerClient(urlSupabase(), clavePublica(), {
    cookies: {
      getAll: () => galletas.getAll(),
      setAll: (nuevas) => {
        try {
          for (const { name, value, options } of nuevas) galletas.set(name, value, options);
        } catch {
          // Un Server Component no puede escribir cookies. No es un error: el
          // refresco de sesión lo hace el proxy, que sí puede.
        }
      },
    },
  });
}
