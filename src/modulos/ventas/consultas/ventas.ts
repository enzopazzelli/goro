import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { EstadoVenta, ItemVentaReciente, MedioPago, VentaReciente } from "../tipos";

type FilaMovimiento = {
  kg: number;
  baldes: { sabores: { id: number; nombre: string } | null } | null;
};

type FilaItem = {
  id: number;
  precio: number;
  formatos: { nombre: string } | null;
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
function mapearItem(fila: FilaItem): ItemVentaReciente {
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
    formatoNombre: fila.formatos?.nombre ?? "",
    precio: fila.precio,
    sabores,
  };
}

function mapearVenta(fila: FilaVenta): VentaReciente {
  return {
    id: fila.id,
    medioPago: fila.medio_pago,
    total: fila.total,
    estado: fila.estado,
    creadoEn: fila.creado_en,
    items: fila.venta_items.map(mapearItem),
  };
}

/** Últimas 20 ventas, con sus items y los sabores netamente cargados a cada uno. */
export async function listarVentasRecientes(): Promise<VentaReciente[]> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("ventas")
    .select(
      `id, medio_pago, total, estado, creado_en,
       venta_items (
         id, precio,
         formatos ( nombre ),
         movimientos_balde ( kg, baldes ( sabores ( id, nombre ) ) )
       )`,
    )
    .order("creado_en", { ascending: false })
    .limit(20);

  return ((data as unknown as FilaVenta[] | null) ?? []).map(mapearVenta);
}
