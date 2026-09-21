import type { Insumo } from "../tipos";
import { FilaInsumoExpandible } from "./FilaInsumoExpandible";

export function TablaInsumos({ insumos, esDuenio }: { insumos: Insumo[]; esDuenio: boolean }) {
  if (insumos.length === 0) {
    return <p className="text-sm text-texto-suave">Ningún insumo con ese nombre.</p>;
  }

  return (
    <table className="w-full text-left text-sm">
      <thead className="border-b border-linea font-mono text-xs text-texto-suave uppercase">
        <tr>
          <th className="p-2 font-normal">Insumo</th>
          <th className="p-2 font-normal">Código</th>
          <th className="p-2 font-normal">Cantidad</th>
          <th className="p-2 font-normal">Estado</th>
          <th className="p-2 font-normal" colSpan={2}></th>
        </tr>
      </thead>
      <tbody>
        {insumos.map((insumo) => (
          <FilaInsumoExpandible key={insumo.id} insumo={insumo} esDuenio={esDuenio} />
        ))}
      </tbody>
    </table>
  );
}
