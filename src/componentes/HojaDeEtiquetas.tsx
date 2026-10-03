import type { ReactNode } from "react";

/**
 * La grilla de etiquetas. Al imprimir, el CSS (globals.css) deja SOLO esta hoja
 * en la página: se imprime lo que se ve en pantalla, sin el menú ni los botones.
 * Por eso hay una sola por pantalla: el `id` es el que usa esa regla.
 */
export function HojaDeEtiquetas({ children }: { children: ReactNode }) {
  return (
    <div id="hoja-de-etiquetas" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {children}
    </div>
  );
}
