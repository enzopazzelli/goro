import type { Balde } from "./baldes";

/** Suma kg_restante de los baldes vivos, agrupado por sabor. */
export function kgPorSabor(baldes: Balde[]): Record<number, number> {
  const totales: Record<number, number> = {};
  for (const balde of baldes) {
    totales[balde.saborId] = (totales[balde.saborId] ?? 0) + balde.kgRestante;
  }
  return totales;
}
