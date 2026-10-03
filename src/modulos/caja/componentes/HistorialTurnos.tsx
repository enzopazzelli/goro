import Link from "next/link";
import { Insignia } from "@/componentes/Insignia";
import { Tarjeta } from "@/componentes/Tarjeta";
import { diaYHoraDe, horaDe } from "@/lib/fechas";
import { nombresDePerfiles } from "@/lib/nombresDePerfiles";
import { formatearPlata } from "@/lib/plata";
import { textoDiferencia } from "../arqueo";
import { historialDeTurnos } from "../consultas/historial";
import { diferenciaDeApertura, TURNOS_EN_HISTORIAL } from "../historial";
import { DescargarCaja } from "./DescargarCaja";
import type { TurnoCerrado } from "../tipos";

/** Plata que apareció o faltó entre el cierre anterior y esta apertura. Si coincide, no se dice nada. */
function AvisoApertura({ turno }: { turno: TurnoCerrado }) {
  const diferencia = diferenciaDeApertura(turno);
  if (!diferencia) return null;

  return (
    <Insignia variante={diferencia < 0 ? "alerta" : "advertencia"}>
      {diferencia < 0
        ? `Al abrir faltaban ${formatearPlata(-diferencia)}`
        : `Al abrir sobraban ${formatearPlata(diferencia)}`}
    </Insignia>
  );
}

function FilaTurno({ turno, nombres }: { turno: TurnoCerrado; nombres: Map<string, string> }) {
  const lectura = turno.arqueo ? textoDiferencia(turno.arqueo.diferencia) : null;

  return (
    <tr className="border-b border-linea align-top last:border-0">
      <td className="p-2">
        <div className="numero">
          {diaYHoraDe(turno.abiertoEn)} → {horaDe(turno.cerradoEn)}
        </div>
        <div className="text-xs text-texto-suave">
          Abrió {nombres.get(turno.abiertoPor) ?? "—"} · cerró{" "}
          {nombres.get(turno.cerradoPor) ?? "—"}
        </div>
      </td>
      <td className="numero p-2 text-right">
        {turno.arqueo ? formatearPlata(turno.arqueo.esperado) : "—"}
      </td>
      <td className="numero p-2 text-right">
        {turno.arqueo ? formatearPlata(turno.arqueo.contado) : "—"}
      </td>
      <td className="p-2">
        <div className="flex flex-col items-start gap-1">
          {lectura && <Insignia variante={lectura.variante}>{lectura.texto}</Insignia>}
          <AvisoApertura turno={turno} />
        </div>
      </td>
      <td className="numero p-2 text-right">
        {turno.arqueo ? formatearPlata(turno.arqueo.fondoQueQueda) : "—"}
      </td>
      <td className="p-2 text-right">
        <Link href={`/caja/turno/${turno.id}`} className="text-xs underline opacity-70">
          Ver
        </Link>
      </td>
    </tr>
  );
}

/** Solo se monta para el dueño: los arqueos no los lee nadie más (RLS). */
export async function HistorialTurnos() {
  const [turnos, nombres] = await Promise.all([historialDeTurnos(), nombresDePerfiles()]);

  return (
    <Tarjeta>
      <header>
        <h2 className="font-display text-lg font-semibold">Turnos cerrados</h2>
        <p className="text-sm text-texto-suave">
          Los últimos {TURNOS_EN_HISTORIAL}. La diferencia se muestra siempre, también cuando cierra
          justo.
        </p>
      </header>

      <DescargarCaja />

      {turnos.length === 0 ? (
        <p className="text-sm text-texto-suave">Todavía no se cerró ningún turno.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-linea font-mono text-xs text-texto-suave uppercase">
              <tr>
                <th className="p-2 font-normal">Turno</th>
                <th className="p-2 text-right font-normal">Esperado</th>
                <th className="p-2 text-right font-normal">Contado</th>
                <th className="p-2 font-normal">Arqueo</th>
                <th className="p-2 text-right font-normal">Quedó de fondo</th>
                <th className="p-2 font-normal"></th>
              </tr>
            </thead>
            <tbody>
              {turnos.map((turno) => (
                <FilaTurno key={turno.id} turno={turno} nombres={nombres} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Tarjeta>
  );
}
