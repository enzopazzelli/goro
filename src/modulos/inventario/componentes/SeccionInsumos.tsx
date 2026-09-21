import { Insignia } from "@/componentes/Insignia";
import { Tarjeta } from "@/componentes/Tarjeta";
import { listarInsumos } from "../consultas/insumos";
import { FormularioInsumo } from "./FormularioInsumo";
import { FormularioMovimiento } from "./FormularioMovimiento";

const ETIQUETA_UNIDAD: Record<string, string> = { u: "u", kg: "kg" };

export async function SeccionInsumos({ esDuenio }: { esDuenio: boolean }) {
  const insumos = await listarInsumos();

  return (
    <Tarjeta>
      <header>
        <h2 className="font-display text-lg font-semibold">Insumos</h2>
        <p className="text-sm text-texto-suave">Cucuruchos, potes vacíos, salsas.</p>
      </header>

      <table className="w-full text-left text-sm">
        <thead className="border-b border-linea font-mono text-xs text-texto-suave uppercase">
          <tr>
            <th className="p-2">Insumo</th>
            <th className="p-2">Código</th>
            <th className="p-2">Stock</th>
            <th className="p-2">Estado</th>
            <th className="p-2">Registrar movimiento</th>
          </tr>
        </thead>
        <tbody>
          {insumos.map((insumo) => (
            <tr key={insumo.id} className="border-b border-linea last:border-0">
              <td className="p-2">{insumo.nombre}</td>
              <td className="numero p-2">{insumo.codigo}</td>
              <td className="numero p-2">
                {insumo.cantidad} {ETIQUETA_UNIDAD[insumo.unidad]}
              </td>
              <td className="p-2">
                <Insignia variante={insumo.cantidad <= insumo.minimo ? "advertencia" : "ok"}>
                  {insumo.cantidad <= insumo.minimo ? "Reponer" : "Ok"}
                </Insignia>
              </td>
              <td className="p-2">
                <FormularioMovimiento insumoId={insumo.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {esDuenio && <FormularioInsumo />}
    </Tarjeta>
  );
}
