import type { ComponentProps } from "react";

type Props = ComponentProps<"button"> & { variante?: "principal" | "suave" };

const ESTILOS = {
  principal: "bg-acento text-acento-texto hover:brightness-110",
  suave: "bg-superficie text-texto border border-linea hover:bg-superficie-honda",
} as const;

export function Boton({ variante = "principal", className = "", ...resto }: Props) {
  return (
    <button
      className={`rounded-(--r) px-4 py-2 text-sm font-semibold transition disabled:opacity-45 ${ESTILOS[variante]} ${className}`}
      {...resto}
    />
  );
}
