import "server-only";
import { ZONA_HORARIA } from "@/config/comercio";
import { nombreDeItem } from "@/lib/nombreItem";
import { periodoAnterior, rangoUtc, type Periodo } from "@/lib/periodos";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { MedioPago } from "@/modulos/ventas/tipos";
import type {
  ArticuloVendido,
  CostoDeLoVendido,
  KilosDeSabor,
  ResumenDelPeriodo,
  VentasPorMedio,
} from "../tipos";

type FilaMedio = { medio_pago: MedioPago; cantidad: number; total: number };
type FilaSabor = { sabor_id: number; sabor_nombre: string; kg: number };
type FilaCosto = { costo_helado: number; costo_insumos: number };
type FilaArticulo = {
  formato_nombre: string | null;
  presentacion_nombre: string | null;
  presentacion_unidades: number | null;
  insumo_nombre: string | null;
  unidades: number;
  total: number;
};

function medios(data: unknown): VentasPorMedio[] {
  return ((data as FilaMedio[] | null) ?? []).map((fila) => ({
    medioPago: fila.medio_pago,
    cantidad: fila.cantidad,
    total: fila.total,
  }));
}

function sabores(data: unknown): KilosDeSabor[] {
  return ((data as FilaSabor[] | null) ?? []).map((fila) => ({
    saborId: fila.sabor_id,
    saborNombre: fila.sabor_nombre,
    // numeric llega como texto: sumarlo sin convertir concatena.
    kg: Number(fila.kg),
  }));
}

/**
 * El nombre lo arma `nombreDeItem`, el mismo que ve el cajero en el carrito: la
 * base devuelve los pedazos justamente para no tener el nombre en dos lugares.
 */
function articulos(data: unknown): ArticuloVendido[] {
  return ((data as FilaArticulo[] | null) ?? []).map((fila) => ({
    nombre: nombreDeItem({
      formatos: fila.formato_nombre ? { nombre: fila.formato_nombre } : null,
      presentaciones_insumo: fila.presentacion_nombre
        ? {
            nombre: fila.presentacion_nombre,
            unidades: fila.presentacion_unidades ?? 0,
            insumos: fila.insumo_nombre ? { nombre: fila.insumo_nombre } : null,
          }
        : null,
    }),
    unidades: fila.unidades,
    total: fila.total,
  }));
}

/** Viene una sola fila; si la consulta falló, costo cero antes que una pantalla rota. */
function costo(data: unknown): CostoDeLoVendido {
  const fila = (data as FilaCosto[] | null)?.[0];

  return { helado: Number(fila?.costo_helado ?? 0), insumos: Number(fila?.costo_insumos ?? 0) };
}

/**
 * Todo lo que muestra el Panel, en paralelo: ninguna consulta depende de otra.
 *
 * Las sumas las hace Postgres. El total de un mes son miles de filas que no
 * tienen por qué viajar para convertirse en cuatro números, y la zona horaria va
 * como parámetro para que el día y la hora sean los del local.
 */
export async function resumenDelPeriodo(periodo: Periodo): Promise<ResumenDelPeriodo> {
  const { desdeIso, hastaIso } = rangoUtc(periodo);
  const rango = { p_desde: desdeIso, p_hasta: hastaIso };

  const anterior = rangoUtc(periodoAnterior(periodo));
  const rangoAnterior = { p_desde: anterior.desdeIso, p_hasta: anterior.hastaIso };

  const supabase = await clienteServidor();
  const [porMedio, porHora, porSabor, porDia, porArticulo, costos, anteriores] = await Promise.all([
    supabase.rpc("ventas_del_periodo", rango),
    supabase.rpc("ventas_por_hora", { ...rango, p_zona: ZONA_HORARIA }),
    supabase.rpc("kilos_por_sabor", rango),
    supabase.rpc("ventas_por_dia", { ...rango, p_zona: ZONA_HORARIA }),
    supabase.rpc("unidades_por_articulo", rango),
    supabase.rpc("costo_de_lo_vendido", rango),
    supabase.rpc("ventas_del_periodo", rangoAnterior),
  ]);

  return {
    porMedio: medios(porMedio.data),
    porHora: porHora.data ?? [],
    porSabor: sabores(porSabor.data),
    porDia: porDia.data ?? [],
    porArticulo: articulos(porArticulo.data),
    costo: costo(costos.data),
    porMedioAnterior: medios(anteriores.data),
  };
}
