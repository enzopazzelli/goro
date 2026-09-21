import type { ComponentProps } from "react";

type Props = ComponentProps<"button"> & { activa: boolean };

export function Pildora({ activa, className = "", ...resto }: Props) {
  return (
    <button
      type="button"
      aria-pressed={activa}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
        activa
          ? "border-marco bg-marco text-fondo"
          : "border-linea bg-superficie text-texto-suave hover:bg-superficie-honda"
      } ${className}`}
      {...resto}
    />
  );
}
