import type { ComponentProps } from "react";
import { seleccionarAlEnfocar } from "@/lib/seleccionarAlEnfocar";

type Props = ComponentProps<"input"> & { etiqueta: string };

export function Campo({ etiqueta, id, className = "", onFocus, ...resto }: Props) {
  return (
    <label className="flex flex-col gap-1" htmlFor={id}>
      <span className="font-mono text-xs font-semibold tracking-wide text-texto-suave uppercase">
        {etiqueta}
      </span>
      <input
        id={id}
        className={`rounded-(--r) border border-linea bg-superficie px-3 py-2 text-texto outline-none focus-visible:border-acento ${className}`}
        onFocus={(evento) => {
          seleccionarAlEnfocar(evento);
          onFocus?.(evento);
        }}
        {...resto}
      />
    </label>
  );
}
