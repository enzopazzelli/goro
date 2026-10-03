import { formatearPlata } from "@/lib/plata";
import type { BaldesDelPeriodo } from "../tipos";

/**
 * Los baldes que salieron del circuito en el período, por las dos puertas. La
 * diferencia es plata: un balde que se terminó y volvió al proveedor no costó
 * nada; uno que se vendió entero se llevó el envase y hay que comprar otro.
 */
export function CicloDeBaldes({ baldes }: { baldes: BaldesDelPeriodo }) {
  if (baldes.terminados === 0 && baldes.vendidos === 0) {
    return <p className="text-sm text-texto-suave">Ningún balde salió en este período.</p>;
  }

  return (
    <dl className="flex flex-wrap gap-x-10 gap-y-4">
      <div className="flex flex-col">
        <dt className="font-mono text-xs tracking-wide text-texto-suave uppercase">
          Se terminaron
        </dt>
        <dd className="numero text-2xl font-medium">{baldes.terminados}</dd>
        <dd className="text-sm text-texto-suave">vuelven al proveedor, sin costo de envase</dd>
      </div>
      <div className="flex flex-col">
        <dt className="font-mono text-xs tracking-wide text-texto-suave uppercase">
          Se vendieron enteros
        </dt>
        <dd className="numero text-2xl font-medium">{baldes.vendidos}</dd>
        <dd className="text-sm text-texto-suave">
          {baldes.vendidos === 0
            ? "ninguno se llevó el envase"
            : `envases a reponer: ${formatearPlata(baldes.envasesPorReponer)}`}
        </dd>
      </div>
    </dl>
  );
}
