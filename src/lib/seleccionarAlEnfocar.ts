import type { FocusEvent } from "react";

/**
 * Un casillero numérico que arranca en 0 obligaba a borrar el 0 antes de
 * escribir: se quedaba "05000". Al enfocarlo queda todo seleccionado, así que
 * lo que se escribe lo pisa. Los de texto no se tocan: ahí quien escribe
 * quiere ubicar el cursor.
 */
export function seleccionarAlEnfocar(evento: FocusEvent<HTMLInputElement>) {
  if (evento.currentTarget.type === "number") evento.currentTarget.select();
}
