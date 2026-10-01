import type { ReactNode } from "react";
import { formatearPlata } from "@/lib/plata";
import type { ResumenTurno as Resumen } from "../resumen";

function Dato({
  etiqueta,
  children,
  pie,
  destacado = false,
}: {
  etiqueta: string;
  children: ReactNode;
  pie?: string;
  destacado?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-1 rounded-(--r) border p-3 ${
        destacado ? "border-marco bg-marco text-fondo" : "border-linea bg-superficie"
      }`}
    >
      <span
        className={`font-mono text-xs tracking-wide uppercase ${
          destacado ? "text-fondo/70" : "text-texto-suave"
        }`}
      >
        {etiqueta}
      </span>
      <span className="numero text-2xl font-medium">{children}</span>
      {pie && (
        <span className={`text-xs ${destacado ? "text-fondo/70" : "text-texto-suave"}`}>{pie}</span>
      )}
    </div>
  );
}

/**
 * Solo para el dueño: con el arqueo ciego, estos totales son justo lo que no
 * ve quien cuenta. Las cinco primeras cifras suman a "Debería haber", así el
 * número se puede reconstruir a ojo.
 */
export function ResumenTurno({ resumen }: { resumen: Resumen }) {
  const salidas = resumen.gastos + resumen.retiros + resumen.anulaciones;
  const fueraDelCajon = resumen.porMedio.tarjeta + resumen.porMedio.transferencia;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Dato etiqueta="Fondo de apertura">{formatearPlata(resumen.fondo)}</Dato>
        <Dato etiqueta="Ventas en efectivo">{formatearPlata(resumen.ventasEfectivo)}</Dato>
        <Dato etiqueta="Ingresos">{formatearPlata(resumen.ingresos)}</Dato>
        <Dato
          etiqueta="Salidas"
          pie={`Gastos ${formatearPlata(resumen.gastos)} · Retiros ${formatearPlata(resumen.retiros)} · Anulaciones ${formatearPlata(resumen.anulaciones)}`}
        >
          {formatearPlata(-salidas)}
        </Dato>
        <Dato
          etiqueta="Debería haber en caja"
          pie={`Sin contar ${formatearPlata(fueraDelCajon)} de tarjeta y transferencia`}
          destacado
        >
          {formatearPlata(resumen.esperado)}
        </Dato>
      </div>
    </div>
  );
}
