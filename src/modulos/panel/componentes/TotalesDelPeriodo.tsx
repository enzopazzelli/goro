import { formatearPlata } from "@/lib/plata";
import { ETIQUETA_MEDIO_PAGO, MEDIOS_DE_PAGO } from "@/modulos/ventas/tipos";
import { totalesDelPeriodo } from "../resumen";
import type { VentasPorMedio } from "../tipos";

function Dato({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-mono text-xs tracking-wide text-texto-suave uppercase">{rotulo}</span>
      <span className="numero text-2xl font-medium">{valor}</span>
    </div>
  );
}

/**
 * Lo primero que se mira al entrar. El desglose por medio de pago se muestra
 * completo, con los medios en cero incluidos: que Tarjeta diga $0 es un dato
 * (el posnet no anduvo), y que falte de la lista es una duda.
 */
export function TotalesDelPeriodo({ porMedio }: { porMedio: VentasPorMedio[] }) {
  const { cantidad, total, ticketPromedio } = totalesDelPeriodo(porMedio);
  const deCada = (medio: VentasPorMedio["medioPago"]) =>
    porMedio.find((cada) => cada.medioPago === medio)?.total ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-x-10 gap-y-4">
        <Dato rotulo="Vendido" valor={formatearPlata(total)} />
        <Dato rotulo="Ventas" valor={String(cantidad)} />
        <Dato rotulo="Ticket promedio" valor={formatearPlata(ticketPromedio)} />
      </div>

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
