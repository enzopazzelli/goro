import type { Unidad } from "./tipos";

// Dos decimales y no uno, como en el resto de los kilos: un pote de 250 g
// redondeado a "0,3 kg" diría algo que no se tiró.
const NUMERO = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });

/** "0,25 kg", "3 u". */
export function textoDeCantidad(cantidad: number, unidad: Unidad): string {
  return `${NUMERO.format(cantidad)} ${unidad}`;
}
