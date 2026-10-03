import { EnlaceDeDescarga } from "@/componentes/EnlaceDeDescarga";
import { Tarjeta } from "@/componentes/Tarjeta";
import { diaCorto, type Periodo } from "@/lib/periodos";
import { formatearPlata } from "@/lib/plata";
import { listarSabores } from "@/lib/sabores";
import { listarVentas } from "../consultas/ventas";
import { ETIQUETA_MEDIO_PAGO, type MedioPago } from "../tipos";
import { FilaVenta } from "./FilaVenta";
import { FiltrosHistorial } from "./FiltrosHistorial";

/**
 * Más de cien filas no se leen ni sirven para encontrar una venta: lo que
 * corresponde es acotar el rango. El día que haga falta el total de un mes
 * entero, ese número lo suma Postgres en el Panel, no esta pantalla.
 */
const TOPE = 100;

/** Lo que el Excel recibe: el mismo filtro de la pantalla, pero el archivo trae TODAS las ventas, sin el tope de 100. */
function parametrosDeDescarga(periodo: Periodo, medioPago: MedioPago | null): string {
  const parametros = new URLSearchParams({ desde: periodo.desde, hasta: periodo.hasta });
  if (medioPago) parametros.set("medio", medioPago);
  return parametros.toString();
}

function plural(cantidad: number, singular: string): string {
  return `${cantidad} ${singular}${cantidad === 1 ? "" : "s"}`;
}

/** Qué filtro quedó puesto, para que "no hay nada" no se lea como "no vendimos nada". */
function sinVentas(periodo: Periodo, medioPago: MedioPago | null): string {
  const medio = medioPago ? ` con ${ETIQUETA_MEDIO_PAGO[medioPago].toLowerCase()}` : "";
  const cuando =
    periodo.desde === periodo.hasta
      ? `el ${diaCorto(periodo.desde)}`
      : `entre el ${diaCorto(periodo.desde)} y el ${diaCorto(periodo.hasta)}`;

  return `Ninguna venta${medio} ${cuando}.`;
}

export async function SeccionHistorial({
  periodo,
  medioPago,
  esDuenio,
}: {
  periodo: Periodo;
  medioPago: MedioPago | null;
  esDuenio: boolean;
}) {
  const [{ ventas, hayMas }, sabores] = await Promise.all([
    listarVentas({ periodo, medioPago, limite: TOPE }),
    listarSabores(),
  ]);

  const cobradas = ventas.filter((venta) => venta.estado === "cobrada");
  const anuladas = ventas.length - cobradas.length;
  const total = cobradas.reduce((suma, venta) => suma + venta.total, 0);

  return (
    <Tarjeta>
      <FiltrosHistorial periodo={periodo} medioPago={medioPago} />

      <p className="border-t border-linea pt-3 text-sm text-texto-suave">
        <span className="font-semibold text-texto">{plural(cobradas.length, "venta")}</span> ·{" "}
        <span className="numero font-semibold text-texto">{formatearPlata(total)}</span> cobrado
        {anuladas > 0 && ` · ${plural(anuladas, "anulada")}`}
      </p>

      {esDuenio && (
        <div>
          <EnlaceDeDescarga href={`/exportar/ventas?${parametrosDeDescarga(periodo, medioPago)}`}>
            Descargar este período en Excel
          </EnlaceDeDescarga>
        </div>
      )}

      {hayMas && (
        <p className="text-sm text-alerta">
          Hay más de {TOPE} ventas en este rango y se muestran las últimas {TOPE}: acotá las fechas
          para que el total sea el del período completo.
        </p>
      )}

      {ventas.length === 0 ? (
        <p className="text-sm text-texto-suave">{sinVentas(periodo, medioPago)}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {ventas.map((venta) => (
            <FilaVenta key={venta.id} venta={venta} sabores={sabores} />
          ))}
        </div>
      )}
    </Tarjeta>
  );
}
