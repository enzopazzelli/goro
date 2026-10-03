import type { NextRequest } from "next/server";
import { respuestaDeExcel, type Libro } from "@/lib/excel/libro";
import { periodoPedido } from "@/lib/periodos";
import { duenioQuePide } from "@/modulos/auth/consultas/administracion";
import { armarLibroDeCaja } from "@/modulos/caja/consultas/exportar";
import { armarLibroDeInventario } from "@/modulos/inventario/consultas/exportar";
import { armarLibroDeVentas } from "@/modulos/ventas/consultas/exportar";
import { esMedioDePago } from "@/modulos/ventas/tipos";

/*
 * Los Excel: inventario, ventas y caja. Es un Route Handler y no una acción del
 * servidor porque tiene que devolver un archivo, y es un GET para que un enlace
 * común lo baje. Los enlaces que apuntan acá NO usan <Link>: Next precargaría la
 * ruta y armaría el archivo entero de balde, cada vez que alguien pasa el mouse.
 *
 * Solo el dueño. Los tres archivos son lo que ya ve cada pantalla, pero juntos
 * y completos (sin el tope de 100 filas del Historial), y los nombres de quién
 * hizo cada cosa y el arqueo son del dueño: la base no le deja leerlos a nadie
 * más, y una descarga no es la excusa para saltarse eso.
 */

type Parametros = URLSearchParams;

const LIBROS: Record<string, (parametros: Parametros) => Promise<Libro>> = {
  inventario: () => armarLibroDeInventario(),
  ventas: (parametros) => {
    const medio = parametros.get("medio") ?? undefined;
    return armarLibroDeVentas(
      periodoPedido({
        desde: parametros.get("desde") ?? undefined,
        hasta: parametros.get("hasta") ?? undefined,
      }),
      esMedioDePago(medio) ? medio : null,
    );
  },
  caja: (parametros) =>
    armarLibroDeCaja(
      periodoPedido({
        desde: parametros.get("desde") ?? undefined,
        hasta: parametros.get("hasta") ?? undefined,
      }),
    ),
};

function mensaje(texto: string, estado: number): Response {
  return new Response(texto, {
    status: estado,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function GET(pedido: NextRequest, contexto: RouteContext<"/exportar/[tipo]">) {
  if (!(await duenioQuePide()))
    return mensaje("Solo el dueño puede descargar estos archivos.", 403);

  const { tipo } = await contexto.params;
  const armar = Object.hasOwn(LIBROS, tipo) ? LIBROS[tipo] : undefined;
  if (!armar) return mensaje("Ese archivo no existe.", 404);

  try {
    return await respuestaDeExcel(await armar(pedido.nextUrl.searchParams));
  } catch (error) {
    // Un archivo a medias es peor que ninguno: mejor decir que falló.
    console.error(`Excel de ${tipo}:`, error);
    return mensaje("No se pudo armar el archivo. Probá de nuevo.", 500);
  }
}
