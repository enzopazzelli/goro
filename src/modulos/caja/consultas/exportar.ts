import "server-only";
import type { Libro } from "@/lib/excel/libro";
import { nombresDePerfiles } from "@/lib/nombresDePerfiles";
import { leerTodo } from "@/lib/paginar";
import { rangoUtc, type Periodo } from "@/lib/periodos";
import { clienteServidor } from "@/lib/supabase/servidor";
import { libroDeCaja, type TurnoParaExcel } from "../libroDeCaja";
import type { Arqueo, MovimientoCaja, TipoMovimientoCaja } from "../tipos";

type FilaTurno = {
  id: number;
  abierto_por: string;
  abierto_en: string;
  cerrado_por: string | null;
  cerrado_en: string | null;
};

type FilaMovimiento = {
  id: number;
  turno_id: number;
  tipo: TipoMovimientoCaja;
  monto: number;
  detalle: string | null;
  venta_id: number | null;
  creado_por: string;
  creado_en: string;
  anulado_en: string | null;
};

type FilaArqueo = {
  turno_id: number;
  esperado: number;
  contado: number;
  diferencia: number;
  fondo_que_queda: number;
};

/** Cuántos turnos se piden por vez en un `in (...)`: la URL de la consulta no puede crecer sin límite. */
const TURNOS_POR_PEDIDO = 100;

function aTandas<T>(lista: T[], tamano: number): T[][] {
  const tandas: T[][] = [];
  for (let i = 0; i < lista.length; i += tamano) tandas.push(lista.slice(i, i + tamano));
  return tandas;
}

/**
 * Los turnos que ABRIERON dentro del período, con sus movimientos y su arqueo.
 * Un turno que abre a las 22 y cierra pasada la medianoche es del día en que
 * abrió: así un mismo turno no se parte en dos archivos.
 */
export async function armarLibroDeCaja(periodo: Periodo): Promise<Libro> {
  const { desdeIso, hastaIso } = rangoUtc(periodo);
  const supabase = await clienteServidor();

  const filasTurnos = await leerTodo<FilaTurno>((desde, hasta) =>
    supabase
      .from("turnos_caja")
      .select("id, abierto_por, abierto_en, cerrado_por, cerrado_en")
      .gte("abierto_en", desdeIso)
      .lt("abierto_en", hastaIso)
      .order("id")
      .range(desde, hasta),
  );
  const ids = filasTurnos.map((fila) => fila.id);

  const porTanda = await Promise.all(
    aTandas(ids, TURNOS_POR_PEDIDO).map(async (tanda) => ({
      movimientos: await leerTodo<FilaMovimiento>((desde, hasta) =>
        supabase
          .from("movimientos_caja")
          .select("id, turno_id, tipo, monto, detalle, venta_id, creado_por, creado_en, anulado_en")
          .in("turno_id", tanda)
          .order("id")
          .range(desde, hasta),
      ),
      arqueos: await leerTodo<FilaArqueo>((desde, hasta) =>
        supabase
          .from("arqueos")
          .select("turno_id, esperado, contado, diferencia, fondo_que_queda")
          .in("turno_id", tanda)
          .order("turno_id")
          .range(desde, hasta),
      ),
    })),
  );
  const nombres = await nombresDePerfiles();

  const turnos: TurnoParaExcel[] = filasTurnos.map((fila) => ({
    id: fila.id,
    abiertoPor: fila.abierto_por,
    abiertoEn: fila.abierto_en,
    cerradoPor: fila.cerrado_por,
    cerradoEn: fila.cerrado_en,
  }));

  const movimientos = porTanda
    .flatMap((tanda) => tanda.movimientos)
    .sort((a, b) => a.id - b.id)
    .map((fila): MovimientoCaja & { turnoId: number } => ({
      id: fila.id,
      turnoId: fila.turno_id,
      tipo: fila.tipo,
      monto: fila.monto,
      detalle: fila.detalle,
      ventaId: fila.venta_id,
      creadoPor: fila.creado_por,
      creadoEn: fila.creado_en,
      anulado: fila.anulado_en !== null,
    }));

  const arqueos = porTanda
    .flatMap((tanda) => tanda.arqueos)
    .map((fila): Arqueo & { turnoId: number } => ({
      turnoId: fila.turno_id,
      esperado: fila.esperado,
      contado: fila.contado,
      diferencia: fila.diferencia,
      fondoQueQueda: fila.fondo_que_queda,
    }));

  return libroDeCaja({ turnos, movimientos, arqueos }, nombres);
}
