import { horaDe } from "@/lib/fechas";
import { formatearPlata } from "@/lib/plata";
import { textoDeCantidad } from "../cantidad";
import { ETIQUETA_MOTIVO, type Descarte } from "../tipos";

const CELDA = "p-2 font-normal";

/**
 * Lo tirado hoy. El costo y quién lo cargó son del dueño, como el resto de los
 * costos y de los nombres: `nombres` llega solo para él (la RLS de perfiles no
 * le deja al colaborador leer nombres ajenos).
 */
export function ListaDeHoy({
  descartes,
  nombres,
}: {
  descartes: Descarte[];
  nombres: Map<string, string> | null;
}) {
  if (descartes.length === 0) {
    return <p className="text-sm text-texto-suave">Hoy no se descartó nada.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-linea font-mono text-xs text-texto-suave uppercase">
          <tr>
            <th className={CELDA}>Hora</th>
            <th className={CELDA}>Qué</th>
            <th className={`${CELDA} text-right`}>Cantidad</th>
            <th className={CELDA}>Por qué</th>
            {nombres && <th className={`${CELDA} text-right`}>Costo</th>}
            {nombres && <th className={CELDA}>Cargó</th>}
          </tr>
        </thead>
        <tbody>
          {descartes.map((descarte) => (
            <tr key={descarte.id} className="border-b border-linea last:border-0">
              <td className="numero p-2 text-texto-suave">{horaDe(descarte.creadoEn)}</td>
              <td className="p-2">
                <span className="font-semibold">{descarte.que}</span>
                {descarte.nota && <span className="text-texto-suave"> · {descarte.nota}</span>}
              </td>
              <td className="numero p-2 text-right">
                {textoDeCantidad(descarte.cantidad, descarte.unidad)}
              </td>
              <td className="p-2">{ETIQUETA_MOTIVO[descarte.motivo]}</td>
              {nombres && (
                <td className="numero p-2 text-right">{formatearPlata(descarte.costo)}</td>
              )}
              {nombres && <td className="p-2">{nombres.get(descarte.creadoPor) ?? "—"}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
