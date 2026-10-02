import "server-only";
import { rangoUtc, type Periodo } from "@/lib/periodos";
import { clienteServidor } from "@/lib/supabase/servidor";
import { nombreDeItem } from "@/lib/nombreItem";
import type { EstadoVenta, ItemDeVenta, MedioPago, VentaConTicket } from "../tipos";

type FilaMovimiento = {
  kg: number;
  baldes: { sabores: { id: number; nombre: string } | null } | null;
};

type FilaItem = {
  id: number;
  precio: number;
  formatos: { nombre: string } | null;
  presentaciones_insumo: {
    nombre: string;
    unidades: number;
    insumos: { nombre: string } | null;
  } | null;
  movimientos_balde: FilaMovimiento[];
};

type FilaVenta = {
  id: number;
  medio_pago: MedioPago;
  total: number;
  estado: EstadoVenta;
  creado_en: string;
  venta_items: FilaItem[];
};

/**
 * Un item puede tener más de una fila de movimiento por sabor (una
 * corrección de sabor deja una fila negativa y otra positiva) — se agrupa
 * por sabor y solo se muestran los que quedaron netamente cargados.
 */
function mapearItem(fila: FilaItem): ItemDeVenta {
  const netoPorSabor = new Map<number, { nombre: string; kg: number }>();

  for (const movimiento of fila.movimientos_balde) {
    const sabor = movimiento.baldes?.sabores;
    if (!sabor) continue;
    const acumulado = netoPorSabor.get(sabor.id)?.kg ?? 0;
    netoPorSabor.set(sabor.id, { nombre: sabor.nombre, kg: acumulado + Number(movimiento.kg) });
  }

  const sabores = [...netoPorSabor.entries()]
    .filter(([, valor]) => valor.kg < 0)
    .map(([saborId, valor]) => ({ saborId, saborNombre: valor.nombre }));

  return {
    id: fila.id,
    nombre: nombreDeItem(fila),
    precio: fila.precio,
    sabores,
  };
}

function mapearVenta(fila: FilaVenta): VentaConTicket {
  return {
    id: fila.id,
    medioPago: fila.medio_pago,
    total: fila.total,
    estado: fila.estado,
    creadoEn: fila.creado_en,
    items: fila.venta_items.map(mapearItem),
  };
}

const SELECCION = `id, medio_pago, total, estado, creado_en,
   venta_items (
     id, precio,
     formatos ( nombre ),
     presentaciones_insumo ( nombre, unidades, insumos ( nombre ) ),
     movimientos_balde ( kg, baldes ( sabores ( id, nombre ) ) )
   )`;

export type FiltroVentas = {
  /** Sin período, las últimas sin importar la fecha (el atajo del mostrador). */
  periodo?: Periodo;
  medioPago?: MedioPago | null;
  limite: number;
};

/** `hayMas` es para avisar que el tope dejó ventas afuera, no para paginar. */
export type PaginaDeVentas = { ventas: VentaConTicket[]; hayMas: boolean };

/**
 * Las ventas con su ticket armado: los items, y de cada uno los sabores que
 * quedaron netamente cargados.
 *
 * Se pide una fila más que el tope para saber si quedó algo afuera sin tener
 * que contar el total por separado.
 */
export async function listarVentas({
  periodo,
  medioPago,
  limite,
}: FiltroVentas): Promise<PaginaDeVentas> {
  const supabase = await clienteServidor();
  let consulta = supabase.from("ventas").select(SELECCION);

  if (periodo) {
    const { desdeIso, hastaIso } = rangoUtc(periodo);
    consulta = consulta.gte("creado_en", desdeIso).lt("creado_en", hastaIso);
  }
  if (medioPago) consulta = consulta.eq("medio_pago", medioPago);

  const { data } = await consulta.order("creado_en", { ascending: false }).limit(limite + 1);
  const filas = (data as unknown as FilaVenta[] | null) ?? [];

  return { ventas: filas.slice(0, limite).map(mapearVenta), hayMas: filas.length > limite };
}
