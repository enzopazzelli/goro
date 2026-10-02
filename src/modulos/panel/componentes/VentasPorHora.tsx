import { formatearPlata } from "@/lib/plata";
import { horasDelGrafico } from "../grafico";
import type { VentasEnHora } from "../tipos";

/**
 * El gráfico que contesta a qué hora hay que tener gente en el mostrador.
 *
 * Las barras van en un SVG con `preserveAspectRatio="none"`: son rectángulos,
 * así que estirarlos no molesta, y el gráfico se adapta a cualquier ancho sin
 * cuentas. Los rótulos de la hora son HTML y no texto del SVG, justamente para
 * que no se estiren con él.
 */
export function VentasPorHora({ porHora }: { porHora: VentasEnHora[] }) {
  const horas = horasDelGrafico(porHora);

  if (horas.length === 0) {
    return <p className="text-sm text-texto-suave">Todavía no hay ventas en este período.</p>;
  }

  const pico = horas.reduce((mayor, cada) => (cada.total > mayor.total ? cada : mayor));

  return (
    <div className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${horas.length} 100`}
        preserveAspectRatio="none"
        className="h-36 w-full"
        role="img"
        aria-label={`Ventas por hora. El pico fue a las ${pico.hora}, con ${formatearPlata(pico.total)} en ${pico.cantidad} ventas.`}
      >
        {horas.map((cada, indice) => (
          <rect
            key={cada.hora}
            x={indice + 0.15}
            // El SVG crece para abajo: la barra arranca donde termina su alto.
            y={100 - cada.proporcion * 100}
            width={0.7}
            height={cada.proporcion * 100}
            className={cada.hora === pico.hora ? "fill-destacado" : "fill-acento"}
          >
            <title>{`${cada.hora}:00 — ${formatearPlata(cada.total)} en ${cada.cantidad} ventas`}</title>
          </rect>
        ))}
      </svg>

      <div className="flex font-mono text-xs text-texto-suave">
        {horas.map((cada) => (
          <span key={cada.hora} className="flex-1 text-center">
            {cada.hora}
          </span>
        ))}
      </div>

      <p className="text-sm text-texto-suave">
        El pico fue a las <strong className="numero text-texto">{pico.hora}:00</strong>, con{" "}
        <span className="numero">{formatearPlata(pico.total)}</span> en {pico.cantidad} ventas.
      </p>
    </div>
  );
}
