import type { ComponentProps } from "react";

type Props = ComponentProps<"input"> & { etiqueta: string };

/**
 * Campo con su título arriba, para filas de edición donde varios casilleros
 * conviven: sin título, cuatro números seguidos no dicen qué es cada uno.
 */
export function CampoChico({ etiqueta, className = "", ...resto }: Props) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="font-mono text-xs tracking-wide text-texto-suave uppercase">{etiqueta}</span>
      <input
        className={`rounded-(--r) border border-linea bg-superficie px-2 py-1 text-sm ${className}`}
        {...resto}
      />
    </label>
  );
}
