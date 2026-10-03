import { Tarjeta } from "@/componentes/Tarjeta";
import type { TurnoAbierto } from "@/lib/caja";
import { diaYHoraDe } from "@/lib/fechas";
import { nombresDePerfiles } from "@/lib/nombresDePerfiles";
import { movimientosDelTurno, ventasDelTurno } from "../consultas/turno";
import { resumenDelTurno } from "../resumen";
import { AccionesCaja } from "./AccionesCaja";
import { ResumenTurno } from "./ResumenTurno";
import { TablaMovimientos } from "./TablaMovimientos";
import { VentasDelTurno } from "./VentasDelTurno";

/**
 * Lo que ve cada rol sale de acá. El colaborador recibe los movimientos y nada
 * más: sin resumen, sin ventas por medio y sin nombres. No es solo que no se
 * dibujen: esas consultas directamente no se hacen para él.
 */
export async function SeccionTurnoAbierto({
  turno,
  esDuenio,
}: {
  turno: TurnoAbierto;
  esDuenio: boolean;
}) {
  const [movimientos, ventas, nombres] = await Promise.all([
    movimientosDelTurno(turno.id),
    esDuenio ? ventasDelTurno(turno.id) : null,
    esDuenio ? nombresDePerfiles() : null,
  ]);
  const resumen = ventas ? resumenDelTurno(movimientos, ventas) : null;
  const abrio = nombres?.get(turno.abiertoPor);

  return (
    <>
      <Tarjeta>
        <header className="flex flex-col gap-1">
          <h2 className="font-display text-lg font-semibold">Turno abierto</h2>
          <p className="text-sm text-texto-suave">
            Desde el {diaYHoraDe(turno.abiertoEn)}
            {abrio && ` · lo abrió ${abrio}`}
          </p>
        </header>

        <AccionesCaja />
        {resumen && <ResumenTurno resumen={resumen} />}
      </Tarjeta>

      <Tarjeta>
        <h2 className="font-display text-lg font-semibold">Movimientos del cajón</h2>
        <TablaMovimientos
          movimientos={movimientos}
          nombres={nombres ? Object.fromEntries(nombres) : undefined}
          sePuedeAnular
        />
      </Tarjeta>

      {ventas && resumen && (
        <Tarjeta>
          <header>
            <h2 className="font-display text-lg font-semibold">Ventas del turno</h2>
            <p className="text-sm text-texto-suave">
              Por medio de pago. Tarjeta y transferencia no pasan por el cajón.
            </p>
          </header>
          <VentasDelTurno ventas={ventas} porMedio={resumen.porMedio} />
        </Tarjeta>
      )}
    </>
  );
}
