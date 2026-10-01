const PUBLICAS = ["/ingresar"];

type Pedido = { metodo: string; ruta: string; tieneSesion: boolean };

/**
 * A dónde manda el proxy este pedido, o `null` si lo deja pasar.
 *
 * Solo redirige NAVEGACIONES (GET y HEAD). Una acción del servidor es un POST
 * a la ruta de la página, y redirigirla la rompe: el 307 hace que el navegador
 * repita el mismo POST contra `/ingresar`, que contesta algo que no es la
 * respuesta de una acción, y Next tira "An unexpected response was received
 * from the server". Pasaba al tocar "Salir" desde una pestaña cuya cuenta se
 * había borrado, o cuya sesión se había cerrado desde otro dispositivo.
 *
 * Dejar pasar el POST no abre nada: el proxy nunca fue la barrera. Cada acción
 * verifica la sesión contra la base (RLS y funciones), y la que no tiene
 * sesión responde con su propio error o con su propia redirección.
 */
export function destinoDelProxy({ metodo, ruta, tieneSesion }: Pedido): string | null {
  if (metodo !== "GET" && metodo !== "HEAD") return null;

  const esPublica = PUBLICAS.some((publica) => ruta === publica || ruta.startsWith(`${publica}/`));

  if (!tieneSesion && !esPublica) return "/ingresar";
  if (tieneSesion && esPublica) return "/inicio";
  return null;
}
