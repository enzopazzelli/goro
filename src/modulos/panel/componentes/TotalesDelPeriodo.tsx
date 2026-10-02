import { diaCorto, type Periodo } from "@/lib/periodos";
import { formatearPlata } from "@/lib/plata";
import { ETIQUETA_MEDIO_PAGO, MEDIOS_DE_PAGO } from "@/modulos/ventas/tipos";
import { compararCon, totalesDelPeriodo } from "../resumen";
import type { Variacion, VentasPorMedio } from "../tipos";

/**
 * La diferencia contra el período anterior, con signo y color. El signo es un
 * menos de verdad (U+2212) y no un guion, por lo mismo que en `formatearPlata`.
 */
function Diferencia({
  variacion,
  formatear,
}: {
  variacion: Variacion;
  formatear: (valor: number) => string;
}) {
  if (variacion.porcentaje === null) {
    return <span className="text-xs text-texto-suave">sin nada con qué comparar</span>;
  }

  const subio = variacion.diferencia >= 0;
  const porcentaje = Math.round(Math.abs(variacion.porcentaje) * 100);

  return (
    <span className={`numero text-xs ${subio ? "text-ok" : "text-alerta"}`}>
      {subio ? "+" : "−"}
      {formatear(Math.abs(variacion.diferencia))} ({porcentaje}%)
    </span>
  );
}

function Dato({
  rotulo,
  valor,
  variacion,
  formatear,
}: {
  rotulo: string;
  valor: number;
  variacion: Variacion;
  formatear: (valor: number) => string;
}) {
  return (
    <div className="flex flex-col">
      <span className="font-mono text-xs tracking-wide text-texto-suave uppercase">{rotulo}</span>
      <span className="numero text-2xl font-medium">{formatear(valor)}</span>
      <Diferencia variacion={variacion} formatear={formatear} />
    </div>
  );
}

function textoDelPeriodo(periodo: Periodo): string {
  if (periodo.desde === periodo.hasta) return `el ${diaCorto(periodo.desde)}`;

  return `${diaCorto(periodo.desde)}–${diaCorto(periodo.hasta)}`;
}

/**
 * Lo primero que se mira al entrar, y al lado de cada número con cuánto cambió:
 * $148.000 no es bueno ni malo hasta que se sabe cuánto fue la semana pasada.
 *
 * El desglose por medio de pago se muestra completo, con los medios en cero
 * incluidos: que Tarjeta diga $0 es un dato (el posnet no anduvo), y que falte
 * de la lista es una duda.
 */
export function TotalesDelPeriodo({
  porMedio,
  porMedioAnterior,
  anterior,
}: {
  porMedio: VentasPorMedio[];
  porMedioAnterior: VentasPorMedio[];
  anterior: Periodo;
}) {
  const ahora = totalesDelPeriodo(porMedio);
  const antes = totalesDelPeriodo(porMedioAnterior);
  const deCada = (medio: VentasPorMedio["medioPago"]) =>
    porMedio.find((cada) => cada.medioPago === medio)?.total ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-x-10 gap-y-4">
        <Dato
          rotulo="Vendido"
          valor={ahora.total}
          variacion={compararCon(ahora.total, antes.total)}
          formatear={formatearPlata}
        />
        <Dato
          rotulo="Ventas"
          valor={ahora.cantidad}
          variacion={compararCon(ahora.cantidad, antes.cantidad)}
          formatear={String}
        />
        <Dato
          rotulo="Ticket promedio"
          valor={ahora.ticketPromedio}
          variacion={compararCon(ahora.ticketPromedio, antes.ticketPromedio)}
          formatear={formatearPlata}
        />
      </div>

      <p className="text-xs text-texto-suave">
        Comparado con {textoDelPeriodo(anterior)}, que cerró en{" "}
        <span className="numero">{formatearPlata(antes.total)}</span>.
      </p>

      <dl className="flex flex-wrap gap-x-6 gap-y-1 border-t border-linea pt-3 text-sm">
        {MEDIOS_DE_PAGO.map((medio) => (
          <div key={medio} className="flex gap-2">
            <dt className="text-texto-suave">{ETIQUETA_MEDIO_PAGO[medio]}</dt>
            <dd className="numero">{formatearPlata(deCada(medio))}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
