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

export type EstadoInsumo = "negativo" | "bajo" | "ok";

/**
 * Negativo no bloquea ninguna venta (decisión de negocio): solo avisa que el
 * conteo dejó de cerrar y hay que recontar.
 */
export function estadoDeInsumo(cantidad: number, minimo: number): EstadoInsumo {
  if (cantidad < 0) return "negativo";
  return cantidad <= minimo ? "bajo" : "ok";
}
