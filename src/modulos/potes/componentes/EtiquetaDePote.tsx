import { EtiquetaDeCodigo } from "@/componentes/EtiquetaDeCodigo";
import { formatearPlata } from "@/lib/plata";
import type { PoteEnFreezer } from "../tipos";

/** Lo que dice el pote a simple vista: qué es, cuánto pesó de verdad y cuánto cuesta. */
export function EtiquetaDePote({ pote }: { pote: PoteEnFreezer }) {
  return (
    <EtiquetaDeCodigo
      titulo={`${pote.formatoNombre} · ${pote.saborNombre}`}
      detalle={`${pote.pesoG} g · ${formatearPlata(pote.precio)}`}
      codigo={pote.codigo}
    />
  );
}
