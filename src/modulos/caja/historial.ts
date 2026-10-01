import type { Arqueo, TurnoCerrado } from "./tipos";

export const TURNOS_EN_HISTORIAL = 30;

type TurnoSinArqueo = Omit<TurnoCerrado, "apertura" | "arqueo" | "fondoAnterior">;

/**
 * `turnos` llega del más nuevo al más viejo y con UNO MÁS de los que se
 * muestran: el último solo sirve para saber qué fondo dejó el cierre anterior
 * al turno 30. Como hay una sola caja abierta a la vez, el turno cerrado
 * anterior por id es justamente el que le pasó el cajón.
 */
export function armarHistorial(
  turnos: TurnoSinArqueo[],
  aperturas: Map<number, number>,
  arqueos: Map<number, Arqueo>,
): TurnoCerrado[] {
  return turnos.slice(0, TURNOS_EN_HISTORIAL).map((turno, indice) => {
    const anterior = turnos[indice + 1];
    return {
      ...turno,
      apertura: aperturas.get(turno.id) ?? 0,
      arqueo: arqueos.get(turno.id) ?? null,
      fondoAnterior: anterior ? (arqueos.get(anterior.id)?.fondoQueQueda ?? null) : null,
    };
  });
}

/**
 * Plata que apareció (+) o desapareció (−) entre el cierre anterior y esta
 * apertura, por ejemplo durante la noche. Null si no hay contra qué comparar.
 */
export function diferenciaDeApertura(turno: TurnoCerrado): number | null {
  return turno.fondoAnterior === null ? null : turno.apertura - turno.fondoAnterior;
}
