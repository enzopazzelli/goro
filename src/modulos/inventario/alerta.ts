import type { Balde } from "@/lib/baldes";
import type { Sabor } from "@/lib/sabores";

/**
 * El mínimo compara contra el balde ABIERTO de ese sabor (el que se está
 * sirviendo), no contra el total de la reserva en cámara: avisa "hay que
 * abrir el próximo ya", no "hay que pedirle al proveedor".
 */
export function saborEnAlerta(
  sabor: Pick<Sabor, "stockMinimo">,
  baldeAbierto: Pick<Balde, "kgRestante"> | null,
  stockMinimoDefault: number,
): boolean {
  if (!baldeAbierto) return true;

  const minimoEfectivo = sabor.stockMinimo ?? stockMinimoDefault;
  return baldeAbierto.kgRestante <= minimoEfectivo;
}
