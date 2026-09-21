import type { FilaSaborVista } from "../tipos";
import { FilaSaborExpandible } from "./FilaSaborExpandible";

export function TablaSabores({ filas, esDuenio }: { filas: FilaSaborVista[]; esDuenio: boolean }) {
  if (filas.length === 0) {
    return <p className="text-sm text-texto-suave">Ningún sabor con ese nombre.</p>;
  }

  return (
    <table className="w-full text-left text-sm">
      <thead className="border-b border-linea font-mono text-xs text-texto-suave uppercase">
        <tr>
          <th className="p-2 font-normal">Balde</th>
          <th className="p-2 font-normal">Sabor</th>
          <th className="p-2 font-normal">Balde abierto (kg)</th>
          <th className="p-2 font-normal">Mínimo (kg)</th>
          <th className="p-2 font-normal">Estado</th>
          <th className="p-2 font-normal" colSpan={2}></th>
        </tr>
      </thead>
      <tbody>
        {filas.map((fila) => (
          <FilaSaborExpandible key={fila.sabor.id} {...fila} esDuenio={esDuenio} />
        ))}
      </tbody>
    </table>
  );
}
