import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { EstadoVenta, MedioPago } from "@/modulos/ventas/tipos";
import type { Arqueo, MovimientoCaja, TipoMovimientoCaja, VentaDelTurno } from "../tipos";

type FilaMovimiento = {
  id: number;
  tipo: TipoMovimientoCaja;
  monto: number;
  detalle: string | null;
  venta_id: number | null;
  creado_por: string;
  creado_en: string;
  anulado_en: string | null;
};

export type FilaArqueo = {
  turno_id: number;
  esperado: number;
  contado: number;
  diferencia: number;
  fondo_que_queda: number;
};

export function mapearArqueo(fila: FilaArqueo): Arqueo {
  return {
    esperado: fila.esperado,
    contado: fila.contado,
    diferencia: fila.diferencia,
    fondoQueQueda: fila.fondo_que_queda,
  };
}

/** Del más nuevo al más viejo: lo último que pasó en el cajón queda arriba. */
export async function movimientosDelTurno(turnoId: number): Promise<MovimientoCaja[]> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("movimientos_caja")
    .select("id, tipo, monto, detalle, venta_id, creado_por, creado_en, anulado_en")
    .eq("turno_id", turnoId)
    .order("id", { ascending: false });

  return ((data as FilaMovimiento[] | null) ?? []).map((fila) => ({
    id: fila.id,
    tipo: fila.tipo,
    monto: fila.monto,
    detalle: fila.detalle,
    ventaId: fila.venta_id,
    creadoPor: fila.creado_por,
    creadoEn: fila.creado_en,
    anulado: fila.anulado_en !== null,
  }));
}

export async function ventasDelTurno(turnoId: number): Promise<VentaDelTurno[]> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("ventas")
    .select("id, medio_pago, total, estado, creado_en")
    .eq("turno_id", turnoId)
    .order("id", { ascending: false });

  type Fila = {
    id: number;
    medio_pago: MedioPago;
    total: number;
    estado: EstadoVenta;
    creado_en: string;
  };
  return ((data as Fila[] | null) ?? []).map((fila) => ({
    id: fila.id,
    medioPago: fila.medio_pago,
    total: fila.total,
    estado: fila.estado,
    creadoEn: fila.creado_en,
  }));
}

/** Null para el colaborador: RLS de arqueos. */
export async function arqueoDelTurno(turnoId: number): Promise<Arqueo | null> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("arqueos")
    .select("turno_id, esperado, contado, diferencia, fondo_que_queda")
    .eq("turno_id", turnoId)
    .maybeSingle<FilaArqueo>();
  return data ? mapearArqueo(data) : null;
}
