import type { ComponentProps } from "react";

type Props = ComponentProps<"input"> & { etiqueta: string };

export function Campo({ etiqueta, id, className = "", ...resto }: Props) {
  return (
    <label className="flex flex-col gap-1" htmlFor={id}>
      <span className="text-xs font-semibold tracking-wide text-texto-suave uppercase">
        {etiqueta}
      </span>
      <input
        id={id}
        className={`rounded-(--r) border border-linea bg-superficie px-3 py-2 text-texto outline-none focus-visible:border-acento ${className}`}
        {...resto}
      />
    </label>
  );
}
