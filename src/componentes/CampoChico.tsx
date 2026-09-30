import type { ComponentProps } from "react";
import { seleccionarAlEnfocar } from "@/lib/seleccionarAlEnfocar";

type Props = ComponentProps<"input"> & { etiqueta: string };

/**
 * Campo con su título arriba, para filas de edición donde varios casilleros
 * conviven: sin título, cuatro números seguidos no dicen qué es cada uno.
 */
export function CampoChico({ etiqueta, className = "", onFocus, ...resto }: Props) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-xs tracking-wide text-texto-suave uppercase">{etiqueta}</span>
      <input
        className={`rounded-(--r) border border-linea bg-superficie px-2 py-1 text-sm ${className}`}
        onFocus={(evento) => {
          seleccionarAlEnfocar(evento);
          onFocus?.(evento);
        }}
        {...resto}
      />
    </label>
  );
}
