"use client";

import { useState } from "react";
import { BotonImprimir } from "@/componentes/BotonImprimir";
import { HojaDeEtiquetas } from "@/componentes/HojaDeEtiquetas";
import { Tarjeta } from "@/componentes/Tarjeta";
import type { Formato } from "@/lib/formatos";
import type { BaldeParaArmar, PoteEnFreezer } from "../tipos";
import { EtiquetaDePote } from "./EtiquetaDePote";
import { FilaDePote } from "./FilaDePote";
import { FormularioArmarPote } from "./FormularioArmarPote";

/**
 * Armar, ver lo que hay en el freezer, y imprimir las etiquetas de los que se
 * tildan. Un pote recién armado queda tildado solo: lo que se hace enseguida es
 * imprimir su etiqueta. La hoja de abajo es la vista previa Y lo que sale de la
 * impresora (el CSS de impresión deja solo esa hoja).
 */
export function PotesYEtiquetas({
  potes,
  formatos,
  baldes,
}: {
  potes: PoteEnFreezer[];
  formatos: Formato[];
  baldes: BaldeParaArmar[];
}) {
  const [elegidos, setElegidos] = useState<Set<number>>(new Set());

  const alternar = (id: number) =>
    setElegidos((actuales) => {
      const siguientes = new Set(actuales);
      if (!siguientes.delete(id)) siguientes.add(id);
      return siguientes;
    });

  const aImprimir = potes.filter((pote) => elegidos.has(pote.id));

  return (
    <div className="flex flex-col gap-4">
      <Tarjeta>
        <h2 className="font-display text-lg font-semibold">Armar un pote</h2>
        <FormularioArmarPote
          formatos={formatos}
          baldes={baldes}
          onArmado={(id) => setElegidos((actuales) => new Set(actuales).add(id))}
        />
      </Tarjeta>

      <Tarjeta>
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-semibold">En el freezer ({potes.length})</h2>
            <p className="text-sm text-texto-suave">
              Tildá los que querés imprimir. Un pote se vende escaneando su etiqueta en Ventas.
            </p>
          </div>
          <BotonImprimir disabled={aImprimir.length === 0}>
            Imprimir {aImprimir.length} etiqueta{aImprimir.length === 1 ? "" : "s"}
          </BotonImprimir>
        </header>

        {potes.length === 0 ? (
          <p className="text-sm text-texto-suave">No hay potes armados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-linea font-mono text-xs text-texto-suave uppercase">
                <tr>
                  <th className="p-2 font-normal"></th>
                  <th className="p-2 font-normal">Código</th>
                  <th className="p-2 font-normal">Pote</th>
                  <th className="p-2 text-right font-normal">Peso</th>
                  <th className="p-2 text-right font-normal">Precio</th>
                  <th className="p-2 font-normal">Armado</th>
                  <th className="p-2 font-normal"></th>
                </tr>
              </thead>
              <tbody>
                {potes.map((pote) => (
                  <FilaDePote
                    key={pote.id}
                    pote={pote}
                    elegido={elegidos.has(pote.id)}
                    onAlternar={() => alternar(pote.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>

      {aImprimir.length > 0 && (
        <Tarjeta>
          <h2 className="font-display text-lg font-semibold">Vista previa de la hoja</h2>
          <HojaDeEtiquetas>
            {aImprimir.map((pote) => (
              <EtiquetaDePote key={pote.id} pote={pote} />
            ))}
          </HojaDeEtiquetas>
        </Tarjeta>
      )}
    </div>
  );
}
