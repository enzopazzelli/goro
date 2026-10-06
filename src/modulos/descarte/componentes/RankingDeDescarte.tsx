import { formatearPlata } from "@/lib/plata";
import { textoDeCantidad } from "../cantidad";
import type { RenglonDeDescarte } from "../tipos";

const CELDA = "p-2 font-normal";

/** Lo que más se tira, de mayor a menor en plata. Es lo que dice qué producir o comprar menos. */
export function RankingDeDescarte({ ranking }: { ranking: RenglonDeDescarte[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-linea font-mono text-xs text-texto-suave uppercase">
          <tr>
            <th className={CELDA}>Lo que más se tira</th>
            <th className={`${CELDA} text-right`}>Cantidad</th>
            <th className={`${CELDA} text-right`}>Veces</th>
            <th className={`${CELDA} text-right`}>Costo</th>
          </tr>
        </thead>
        <tbody>
          {ranking.map((renglon) => (
            <tr key={renglon.grupo} className="border-b border-linea last:border-0">
              <td className="p-2 font-semibold">{renglon.que}</td>
              <td className="numero p-2 text-right">
                {textoDeCantidad(renglon.cantidad, renglon.unidad)}
              </td>
              <td className="numero p-2 text-right">{renglon.veces}</td>
              <td className="numero p-2 text-right">{formatearPlata(renglon.costo)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
