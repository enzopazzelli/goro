import Link from "next/link";
import type { Periodo } from "@/lib/periodos";
import { formatearPlata } from "@/lib/plata";
import { margenDelPeriodo } from "../resumen";
import type { CostoDeLoVendido } from "../tipos";

/**
 * El margen BRUTO: lo cobrado menos lo que costó lo que salió. No descuenta
 * sueldos, alquiler ni los gastos de caja — esos están en Caja, y mezclarlos
 * daría un número que no es ni una cosa ni la otra. Lo dice la bajada, porque
 * un "ganancia" sin aclarar se lee como la plata que quedó en el bolsillo.
 */
export function MargenDelPeriodo({
  vendido,
  costo,
  descartado,
  periodo,
}: {
  vendido: number;
  costo: CostoDeLoVendido;
  /** Lo que se tiró en el período, al costo de ese día. */
  descartado: number;
  periodo: Periodo;
}) {
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
        {/* Solo aparece si se vendió algún balde entero: si no, es una línea en cero. */}
        {costo.envases > 0 && (
          <div className="flex gap-2">
            <dt className="text-texto-suave">Envases de baldes vendidos</dt>
            <dd className="numero">{formatearPlata(Math.round(costo.envases))}</dd>
          </div>
        )}
      </dl>

      {/* Al lado y no restado: el margen es de lo vendido, y lo tirado no se vendió. Separados
          se ve cada uno; mezclados, ninguno. */}
      <p className="text-sm">
        <span className="text-texto-suave">Se tiró </span>
        <Link
          href={`/descarte?${new URLSearchParams(periodo)}`}
          className="numero font-semibold text-alerta hover:underline"
        >
          {formatearPlata(Math.round(descartado))}
        </Link>
        <span className="text-texto-suave"> en el período (no está restado del margen).</span>
      </p>
    </div>
  );
}
