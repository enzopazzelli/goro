import { formatearPlata } from "@/lib/plata";
import { margenDelPeriodo } from "../resumen";
import type { CostoDeLoVendido } from "../tipos";

/**
 * El margen BRUTO: lo cobrado menos lo que costó lo que salió. No descuenta
 * sueldos, alquiler ni los gastos de caja — esos están en Caja, y mezclarlos
 * daría un número que no es ni una cosa ni la otra. Lo dice la bajada, porque
 * un "ganancia" sin aclarar se lee como la plata que quedó en el bolsillo.
 */
export function MargenDelPeriodo({ vendido, costo }: { vendido: number; costo: CostoDeLoVendido }) {
  const margen = margenDelPeriodo(vendido, costo);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-x-10 gap-y-4">
        <div className="flex flex-col">
          <span className="font-mono text-xs tracking-wide text-texto-suave uppercase">Costó</span>
          <span className="numero text-2xl font-medium">{formatearPlata(margen.costo)}</span>
        </div>
        <div className="flex flex-col">
          <span className="font-mono text-xs tracking-wide text-texto-suave uppercase">
            Ganancia bruta
          </span>
          <span
            className={`numero text-2xl font-medium ${margen.ganancia < 0 ? "text-alerta" : "text-ok"}`}
          >
            {formatearPlata(margen.ganancia)}
          </span>
        </div>
        {margen.porcentaje !== null && (
          <div className="flex flex-col">
            <span className="font-mono text-xs tracking-wide text-texto-suave uppercase">
              De cada peso
            </span>
            <span className="numero text-2xl font-medium">
              {Math.round(margen.porcentaje * 100)}%
            </span>
          </div>
        )}
      </div>

      <dl className="flex flex-wrap gap-x-6 gap-y-1 border-t border-linea pt-3 text-sm">
        <div className="flex gap-2">
          <dt className="text-texto-suave">Helado de los baldes</dt>
          <dd className="numero">{formatearPlata(Math.round(costo.helado))}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-texto-suave">Envases y productos</dt>
          <dd className="numero">{formatearPlata(Math.round(costo.insumos))}</dd>
        </div>
      </dl>
    </div>
  );
}
