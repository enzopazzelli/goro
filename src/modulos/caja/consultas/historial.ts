import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import { armarHistorial, TURNOS_EN_HISTORIAL } from "../historial";
import type { TurnoCerrado } from "../tipos";
import { mapearArqueo, type FilaArqueo } from "./turno";

type FilaTurno = {
  id: number;
  abierto_por: string;
  abierto_en: string;
  cerrado_por: string;
  cerrado_en: string;
};

export type CabeceraTurno = {
  id: number;
  abiertoPor: string;
  abiertoEn: string;
  cerradoPor: string | null;
  cerradoEn: string | null;
};

/** Un turno por id, abierto o cerrado. Null si no existe. */
export async function turnoPorId(turnoId: number): Promise<CabeceraTurno | null> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("turnos_caja")
    .select("id, abierto_por, abierto_en, cerrado_por, cerrado_en")
    .eq("id", turnoId)
    .maybeSingle();

  if (!data) return null;
  return {
    id: data.id,
    abiertoPor: data.abierto_por,
    abiertoEn: data.abierto_en,
    cerradoPor: data.cerrado_por,
    cerradoEn: data.cerrado_en,
  };
}

/** Últimos turnos cerrados con su arqueo. Pantalla del dueño: el colaborador recibiría arqueos vacíos. */
export async function historialDeTurnos(): Promise<TurnoCerrado[]> {
  const supabase = await clienteServidor();
  const { data: turnos } = await supabase
    .from("turnos_caja")
    .select("id, abierto_por, abierto_en, cerrado_por, cerrado_en")
    .not("cerrado_en", "is", null)
    .order("id", { ascending: false })
    // Uno más de los que se muestran: el último solo aporta el fondo anterior.
    .limit(TURNOS_EN_HISTORIAL + 1);

  const filas = (turnos as FilaTurno[] | null) ?? [];
  if (filas.length === 0) return [];
  const ids = filas.map((fila) => fila.id);

  const [{ data: aperturas }, { data: arqueos }] = await Promise.all([
    supabase
      .from("movimientos_caja")
      .select("turno_id, monto")
      .eq("tipo", "apertura")
      .in("turno_id", ids),
    supabase
      .from("arqueos")
      .select("turno_id, esperado, contado, diferencia, fondo_que_queda")
      .in("turno_id", ids),
  ]);

  return armarHistorial(
    filas.map((fila) => ({
      id: fila.id,
      abiertoPor: fila.abierto_por,
      abiertoEn: fila.abierto_en,
      cerradoPor: fila.cerrado_por,
      cerradoEn: fila.cerrado_en,
    })),
    new Map((aperturas ?? []).map((fila) => [fila.turno_id as number, fila.monto as number])),
    new Map(
      ((arqueos as FilaArqueo[] | null) ?? []).map((fila) => [fila.turno_id, mapearArqueo(fila)]),
    ),
  );
}
