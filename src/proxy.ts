import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { clavePublica, urlSupabase } from "@/lib/supabase/entorno";

/*
 * Dos trabajos, y ninguno es autorizar:
 *
 * 1. Refrescar la sesión. Un Server Component no puede escribir cookies, así
 *    que si el token venció, el único lugar donde se puede renovar es acá.
 * 2. Redirigir rápido a quien no tiene sesión, para no renderizar una pantalla
 *    que después va a rebotar.
 *
 * El chequeo de acá es OPTIMISTA y corre en cada request, incluidas las
 * precargas. Quién puede ver qué se decide contra la base —en `consultas/` y,
 * sobre todo, en las políticas RLS de Postgres—, nunca solo acá.
 */

const PUBLICAS = ["/ingresar"];

export async function proxy(pedido: NextRequest) {
  let respuesta = NextResponse.next({ request: pedido });

  const supabase = createServerClient(urlSupabase(), clavePublica(), {
    cookies: {
      getAll: () => pedido.cookies.getAll(),
      setAll: (nuevas) => {
        for (const { name, value } of nuevas) pedido.cookies.set(name, value);
        respuesta = NextResponse.next({ request: pedido });
        for (const { name, value, options } of nuevas) respuesta.cookies.set(name, value, options);
      },
    },
  });

  // getUser() y no getSession(): es el que revalida el token contra el
  // servidor de auth y, de paso, lo refresca.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ruta = pedido.nextUrl.pathname;
  const esPublica = PUBLICAS.some((p) => ruta === p || ruta.startsWith(`${p}/`));

  if (!user && !esPublica) {
    const destino = pedido.nextUrl.clone();
    destino.pathname = "/ingresar";
    return NextResponse.redirect(destino);
  }

  if (user && esPublica) {
    const destino = pedido.nextUrl.clone();
    destino.pathname = "/inicio";
    return NextResponse.redirect(destino);
  }

  return respuesta;
}

export const config = {
  // Todo menos archivos estáticos e imágenes: para auth conviene que corra en
  // todas las rutas, pero no tiene sentido gastarlo en un .svg.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
