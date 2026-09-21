import type { ComponentProps } from "react";

type Props = ComponentProps<"section"> & { compacta?: boolean };

export function Tarjeta({ compacta = false, className = "", ...resto }: Props) {
  const espaciado = compacta ? "gap-2 p-4" : "gap-4 p-6";
  return (
    <section
      className={`flex flex-col ${espaciado} rounded-(--r-grande) border border-linea bg-superficie shadow-(--shadow-tarjeta) ${className}`}
      {...resto}
    />
  );
}
