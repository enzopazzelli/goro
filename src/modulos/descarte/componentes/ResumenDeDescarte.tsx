import { EnlaceDeDescarga } from "@/componentes/EnlaceDeDescarga";
import { FiltroDePeriodo } from "@/componentes/FiltroDePeriodo";
import { Tarjeta } from "@/componentes/Tarjeta";
import type { Periodo } from "@/lib/periodos";
import { formatearPlata } from "@/lib/plata";
import { descartesDelPeriodo } from "../consultas/descartes";
import { resumirDescartes } from "../resumen";
import { ETIQUETA_MOTIVO } from "../tipos";
import { RankingDeDescarte } from "./RankingDeDescarte";

/** Solo se monta para el dueño: cuánto se tiró en plata, qué es lo que más se tira y por qué. */
export async function ResumenDeDescarte({ periodo }: { periodo: Periodo }) {
  const resumen = resumirDescartes(await descartesDelPeriodo(periodo));

  return (
    <Tarjeta>
      <header>
        <h2 className="font-display text-lg font-semibold">Cuánto se tiró</h2>
        <p className="text-sm text-texto-suave">
          Cada cosa al costo que tenía el día que se tiró. Ordenado por plata: dos kilos de helado y
          dos cucuruchos no se comparan en unidades.
        </p>
      </header>

      <FiltroDePeriodo ruta="/descarte" periodo={periodo} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col">
          <span className="font-mono text-xs tracking-wide text-texto-suave uppercase">
            Total del período
          </span>
          <span className="numero text-3xl font-medium text-alerta">
            {formatearPlata(resumen.total)}
          </span>
        </div>
        <EnlaceDeDescarga href={`/exportar/descarte?${new URLSearchParams(periodo)}`}>
          Descargar Excel
        </EnlaceDeDescarga>
      </div>

      {resumen.ranking.length === 0 ? (
        <p className="text-sm text-texto-suave">En este período no se descartó nada.</p>
      ) : (
        <>
          <RankingDeDescarte ranking={resumen.ranking} />
          <dl className="flex flex-wrap gap-x-6 gap-y-1 border-t border-linea pt-3 text-sm">
            {resumen.porMotivo.map((motivo) => (
              <div key={motivo.motivo} className="flex gap-2">
                <dt className="text-texto-suave">
                  {ETIQUETA_MOTIVO[motivo.motivo]} ({motivo.veces})
                </dt>
                <dd className="numero">{formatearPlata(motivo.costo)}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </Tarjeta>
  );
}
