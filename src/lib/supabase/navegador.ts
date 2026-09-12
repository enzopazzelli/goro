import { createBrowserClient } from "@supabase/ssr";
import { clavePublica, urlSupabase } from "./entorno";

/** Cliente para componentes de cliente. */
export function clienteNavegador() {
  return createBrowserClient(urlSupabase(), clavePublica());
}
