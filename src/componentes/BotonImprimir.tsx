"use client";

import type { ReactNode } from "react";
import { Boton } from "./Boton";

/** Abre el diálogo de impresión del navegador. Lo que sale es la hoja de etiquetas, nada más. */
export function BotonImprimir({ children, disabled }: { children: ReactNode; disabled?: boolean }) {
  return (
    <Boton type="button" variante="suave" disabled={disabled} onClick={() => window.print()}>
      <span aria-hidden="true">🖨 </span>
      {children}
    </Boton>
  );
}
