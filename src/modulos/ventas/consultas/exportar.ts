import "server-only";
import type { Libro } from "@/lib/excel/libro";
import { nombresDePerfiles } from "@/lib/nombresDePerfiles";
import { leerTodo } from "@/lib/paginar";
import { rangoUtc, type Periodo } from "@/lib/periodos";
import { clienteServidor } from "@/lib/supabase/servidor";
import { libroDeVentas } from "../libroDeVentas";
import type { MedioPago } from "../tipos";
import { mapearVenta, SELECCION_DE_VENTAS, type FilaDeVenta } from "./ventas";

/**
 * TODAS las ventas del período, no las 100 que se muestran en pantalla: leídas
 * de a mil, porque el servidor corta ahí sin avisar y un archivo truncado
 * parecería completo.
 */
export async function armarLibroDeVentas(
  periodo: Periodo,
  medioPago: MedioPago | null,
): Promise<Libro> {
  const { desdeIso, hastaIso } = rangoUtc(periodo);
  const supabase = await clienteServidor();

  const [filas, nombres] = await Promise.all([
    leerTodo<FilaDeVenta>((desde, hasta) => {
      let consulta = supabase
        .from("ventas")
        .select(SELECCION_DE_VENTAS)
        .gte("creado_en", desdeIso)
        .lt("creado_en", hastaIso);
      if (medioPago) consulta = consulta.eq("medio_pago", medioPago);
      // Por id y no por fecha: es el único orden que no repite ni salta filas entre páginas.
      return consulta.order("id").range(desde, hasta);
    }),
    nombresDePerfiles(),
  ]);

  return libroDeVentas(
    filas.map((fila) => ({
      ...mapearVenta(fila),
      creadoPor: fila.creado_por,
      anuladoEn: fila.anulado_en,
      anuladoPor: fila.anulado_por,
    })),
    nombres,
  );
}
