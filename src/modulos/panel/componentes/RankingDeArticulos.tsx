import { formatearPlata } from "@/lib/plata";
import type { ArticuloVendido } from "../tipos";

/** Qué se vendió, en unidades y en plata. El orden lo trae la base: primero lo que más salió. */
export function RankingDeArticulos({ porArticulo }: { porArticulo: ArticuloVendido[] }) {
  if (porArticulo.length === 0) {
    return <p className="text-sm text-texto-suave">Todavía no se vendió nada en este período.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-linea font-mono text-xs text-texto-suave uppercase">
          <tr>
            <th className="p-2 font-normal">Artículo</th>
            <th className="p-2 text-right font-normal">Unidades</th>
            <th className="p-2 text-right font-normal">Plata</th>
          </tr>
        </thead>
        <tbody>
          {porArticulo.map((articulo) => (
            <tr key={articulo.nombre} className="border-b border-linea last:border-0">
              <td className="p-2">{articulo.nombre}</td>
              <td className="numero p-2 text-right">{articulo.unidades}</td>
              <td className="numero p-2 text-right">{formatearPlata(articulo.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
