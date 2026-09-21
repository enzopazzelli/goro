import type { ComponentProps } from "react";

type Props = ComponentProps<"button"> & {
  variante?: "principal" | "suave" | "fantasma" | "peligro";
  tamano?: "normal" | "grande";
};

const ESTILOS = {
  principal: "bg-acento text-acento-texto hover:brightness-110",
  suave: "bg-superficie text-texto border border-linea hover:bg-superficie-honda",
  fantasma: "text-texto-suave hover:bg-superficie-honda hover:text-texto",
  peligro: "bg-alerta-fondo text-alerta hover:bg-alerta hover:text-superficie",
} as const;

const TAMANOS = {
  normal: "px-4 py-2 text-sm",
  grande: "px-6 py-3 text-base",
} as const;

export function Boton({
  variante = "principal",
  tamano = "normal",
  className = "",
  ...resto
}: Props) {
  return (
    <button
      className={`rounded-full font-semibold transition disabled:opacity-45 ${ESTILOS[variante]} ${TAMANOS[tamano]} ${className}`}
      {...resto}
    />
  );
}
