import type { ComponentProps } from "react";

type Variante = "principal" | "suave" | "fantasma" | "peligro";
type Tamano = "chico" | "normal" | "grande";

type Props = ComponentProps<"button"> & {
  variante?: Variante;
  tamano?: Tamano;
};

const ESTILOS = {
  principal: "bg-acento text-acento-texto hover:brightness-110",
  suave: "bg-superficie text-texto border border-linea hover:bg-superficie-honda",
  fantasma: "text-texto-suave hover:bg-superficie-honda hover:text-texto",
  peligro: "bg-alerta-fondo text-alerta hover:bg-alerta hover:text-superficie",
} as const;

// `chico` es para las acciones dentro de una fila (Guardar, Editar, Anular).
// Antes eran texto subrayado y en el mostrador no se veían como algo tocable:
// el alto mínimo es el de un dedo, no el de un cursor.
const TAMANOS = {
  chico: "min-h-9 px-3.5 py-1.5 text-sm",
  normal: "px-4 py-2 text-sm",
  grande: "px-6 py-3 text-base",
} as const;

/** Las clases de un botón, para un `Link` que tiene que verse igual que uno. */
export function clasesDeBoton(variante: Variante = "principal", tamano: Tamano = "normal") {
  return `inline-flex items-center justify-center rounded-full font-semibold transition disabled:opacity-45 ${ESTILOS[variante]} ${TAMANOS[tamano]}`;
}

export function Boton({
  variante = "principal",
  tamano = "normal",
  className = "",
  ...resto
}: Props) {
  return <button className={`${clasesDeBoton(variante, tamano)} ${className}`} {...resto} />;
}
