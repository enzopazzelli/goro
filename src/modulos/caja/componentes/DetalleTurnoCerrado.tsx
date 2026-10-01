import { Insignia } from "@/componentes/Insignia";
import { Tarjeta } from "@/componentes/Tarjeta";
import { diaYHoraDe } from "@/lib/fechas";
import { formatearPlata } from "@/lib/plata";
import { textoDiferencia } from "../arqueo";
import type { CabeceraTurno } from "../consultas/historial";
import {
  arqueoDelTurno,
  movimientosDelTurno,
  nombresDePerfiles,
  ventasDelTurno,
} from "../consultas/turno";
import { resumenDelTurno } from "../resumen";
import { ResumenTurno } from "./ResumenTurno";
import { TablaMovimientos } from "./TablaMovimientos";
import { VentasDelTurno } from "./VentasDelTurno";

/** Un turno ya cerrado, de solo lectura: su arqueo está congelado y nada de acá se puede anular. */
export async function DetalleTurnoCerrado({ turno }: { turno: CabeceraTurno }) {
  const [movimientos, ventas, nombres, arqueo] = await Promise.all([
    movimientosDelTurno(turno.id),
    ventasDelTurno(turno.id),
    nombresDePerfiles(),
    arqueoDelTurno(turno.id),
  ]);
  const resumen = resumenDelTurno(movimientos, ventas);
  const lectura = arqueo ? textoDiferencia(arqueo.diferencia) : null;

  return (
    <>
      <Tarjeta>
        <header className="flex flex-col gap-1">
          <h2 className="font-display text-lg font-semibold">Arqueo</h2>
          <p className="text-sm text-texto-suave">
            Abrió {nombres.get(turno.abiertoPor) ?? "—"} el {diaYHoraDe(turno.abiertoEn)}
            {turno.cerradoEn &&
              ` · cerró ${nombres.get(turno.cerradoPor ?? "") ?? "—"} el ${diaYHoraDe(turno.cerradoEn)}`}
          </p>
        </header>

        {arqueo && lectura && (
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <Insignia variante={lectura.variante}>{lectura.texto}</Insignia>
            <span>
              Se contaron <strong className="numero">{formatearPlata(arqueo.contado)}</strong> y
              quedaron <strong className="numero">{formatearPlata(arqueo.fondoQueQueda)}</strong> de
              fondo.
            </span>
          </p>
        )}

        <ResumenTurno resumen={resumen} />
      </Tarjeta>

      <Tarjeta>
        <h2 className="font-display text-lg font-semibold">Movimientos del cajón</h2>
        <TablaMovimientos
          movimientos={movimientos}
          nombres={Object.fromEntries(nombres)}
          sePuedeAnular={false}
        />
      </Tarjeta>

      <Tarjeta>
        <h2 className="font-display text-lg font-semibold">Ventas del turno</h2>
        <VentasDelTurno ventas={ventas} porMedio={resumen.porMedio} />
      </Tarjeta>
    </>
  );
}
