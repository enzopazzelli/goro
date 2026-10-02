import { diaDeSemanaDe } from "@/lib/periodos";
import type { VentasEnDia, VentasEnDiaSemana } from "./tipos";

/** Lunes primero, como el almanaque de acá; `diaDeSemanaDe` cuenta desde el domingo. */
const ORDEN = [1, 2, 3, 4, 5, 6, 0];

/**
 * Cuánto rinde cada día de la semana en el período. Es el indicador que
 * contesta con cuánta gente abrir el sábado: cuatro sábados de un mes dicen
 * algo que un sábado solo no dice.
 *
 * Los días que el período no incluye no aparecen: una fila en cero para un
 * martes que nunca entró en el filtro es ruido, no un dato.
 */
export function ventasPorDiaSemana(porDia: VentasEnDia[]): VentasEnDiaSemana[] {
  const acumulado = new Map<number, VentasEnDiaSemana>();

  for (const dia of porDia) {
    const diaSemana = diaDeSemanaDe(dia.dia);
    const previo = acumulado.get(diaSemana);
    acumulado.set(diaSemana, {
      diaSemana,
      cantidad: (previo?.cantidad ?? 0) + dia.cantidad,
      total: (previo?.total ?? 0) + dia.total,
      dias: (previo?.dias ?? 0) + 1,
      promedio: 0,
    });
  }

  return ORDEN.flatMap((diaSemana) => {
    const fila = acumulado.get(diaSemana);
    return fila ? [{ ...fila, promedio: Math.round(fila.total / fila.dias) }] : [];
  });
}
