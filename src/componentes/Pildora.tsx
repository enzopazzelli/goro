import type { ComponentProps } from "react";

type Props = ComponentProps<"button"> & { activa: boolean };

/** Para cuando la píldora es un link y no un botón (un filtro que vive en la URL). */
export function clasesDePildora(activa: boolean): string {
  return `rounded-full border px-3 py-1 text-xs font-medium transition ${
    activa
      ? "border-marco bg-marco text-fondo"
      : "border-linea bg-superficie text-texto-suave hover:bg-superficie-honda"
  }`;
}

export function Pildora({ activa, className = "", ...resto }: Props) {
  return (
    <button
      type="button"
      aria-pressed={activa}
      className={`${clasesDePildora(activa)} ${className}`}
      {...resto}
    />
  );
}
