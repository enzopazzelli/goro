import type { Insumo } from "./tipos";

/**
 * Lo que se puede elegir al configurar qué consume un formato: solo insumos
 * marcados como componentes (los conos), activos y contados por unidad. Un
 * bombón se revende pero nunca se consume dentro de un formato, y un formato
 * consume "1 cono", no "0,3 kg".
 */
export function insumosParaConsumo(insumos: Insumo[]): Insumo[] {
  return insumos.filter((insumo) => insumo.activo && insumo.unidad === "u" && insumo.esComponente);
}
