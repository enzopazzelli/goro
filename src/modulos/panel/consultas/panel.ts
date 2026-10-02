import "server-only";
import { ZONA_HORARIA } from "@/config/comercio";
import { rangoUtc, type Periodo } from "@/lib/periodos";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { MedioPago } from "@/modulos/ventas/tipos";
import type { ResumenDelPeriodo } from "../tipos";

type FilaMedio = { medio_pago: MedioPago; cantidad: number; total: number };
type FilaHora = { hora: number; cantidad: number; total: number };
type FilaSabor = { sabor_id: number; sabor_nombre: string; kg: number };

/**
 * Las tres sumas del período, en paralelo porque ninguna depende de la otra.
 *
 * Las hace Postgres: el total de un mes son miles de filas que no tienen por
 * qué viajar para convertirse en cuatro números. La zona horaria va como
 * parámetro para que el gráfico por hora use la del local y no la del servidor.
 */
export async function resumenDelPeriodo(periodo: Periodo): Promise<ResumenDelPeriodo> {
  const { desdeIso, hastaIso } = rangoUtc(periodo);
  const rango = { p_desde: desdeIso, p_hasta: hastaIso };
  const supabase = await clienteServidor();

  const [medios, horas, sabores] = await Promise.all([
    supabase.rpc("ventas_del_periodo", rango),
    supabase.rpc("ventas_por_hora", { ...rango, p_zona: ZONA_HORARIA }),
    supabase.rpc("kilos_por_sabor", rango),
  ]);

  return {
    porMedio: ((medios.data as FilaMedio[] | null) ?? []).map((fila) => ({
      medioPago: fila.medio_pago,
      cantidad: fila.cantidad,
      total: fila.total,
    })),
    porHora: (horas.data as FilaHora[] | null) ?? [],
    porSabor: ((sabores.data as FilaSabor[] | null) ?? []).map((fila) => ({
      saborId: fila.sabor_id,
      saborNombre: fila.sabor_nombre,
      // numeric llega como texto: sumarlo sin convertir concatena.
      kg: Number(fila.kg),
    })),
  };
}
