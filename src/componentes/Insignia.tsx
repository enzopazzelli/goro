import type { ReactNode } from "react";

type Variante = "ok" | "advertencia" | "alerta" | "neutra";

const ESTILOS: Record<Variante, string> = {
  ok: "bg-ok-fondo text-ok",
  advertencia: "bg-advertencia-fondo text-advertencia",
  alerta: "bg-alerta-fondo text-alerta",
  neutra: "bg-superficie-honda text-texto-suave",
};

export function Insignia({ variante, children }: { variante: Variante; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-xs tracking-wide uppercase ${ESTILOS[variante]}`}
    >
      {children}
    </span>
  );
}
