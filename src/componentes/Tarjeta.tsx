import type { ComponentProps } from "react";

export function Tarjeta({ className = "", ...resto }: ComponentProps<"section">) {
  return (
    <section
      className={`flex flex-col gap-4 rounded-(--r-grande) border border-linea bg-superficie p-6 shadow-(--shadow-tarjeta) ${className}`}
      {...resto}
    />
  );
}
