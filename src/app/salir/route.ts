import { redirect } from "next/navigation";
import { clienteServidor } from "@/lib/supabase/servidor";

/*
 * Cierra la sesión y manda a ingresar. Existe para quien tiene sesión pero ya
 * no perfil activo (ver `exigirPerfil`): un Server Component no puede escribir
 * cookies, así que no puede cerrarle la sesión él mismo; un Route Handler sí.
 *
 * NADA enlaza acá con un `<Link>`: Next lo precargaría y cerraría la sesión de
 * quien solo pasó el mouse. El botón "Salir" usa la acción del servidor.
 */
export async function GET() {
  const supabase = await clienteServidor();
  await supabase.auth.signOut();
  redirect("/ingresar");
}
