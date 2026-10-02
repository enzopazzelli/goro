import { formatearPlata } from "@/lib/plata";
import { ventasPorDiaSemana } from "../dias";
import { proporcionDe } from "../grafico";
import type { VentasEnDia } from "../tipos";

const NOMBRES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

/**
 * Cuánto rinde cada día de la semana. Es el indicador que contesta con cuánta
 * gente abrir el sábado: se mira el promedio, y al lado cuántos sábados se
 * promediaron — un sábado solo no dice nada.
 */
export function VentasPorDiaSemana({ porDia }: { porDia: VentasEnDia[] }) {
  const semana = ventasPorDiaSemana(porDia);
  const mayor = Math.max(0, ...semana.map((cada) => cada.promedio));

  if (semana.length === 0) {
    return <p className="text-sm text-texto-suave">Todavía no hay ventas en este período.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {semana.map((cada) => (
        <li key={cada.diaSemana} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span>
              {NOMBRES[cada.diaSemana]}
              {cada.dias > 1 && (
                <span className="text-texto-suave"> · {cada.dias} días promediados</span>
              )}
            </span>
            <span className="numero">{formatearPlata(cada.promedio)}</span>
          </div>
          <div aria-hidden="true" className="h-2 rounded-full bg-superficie-honda">
            <div
              className="h-2 rounded-full bg-acento"
              style={{ width: `${proporcionDe(cada.promedio, mayor) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
