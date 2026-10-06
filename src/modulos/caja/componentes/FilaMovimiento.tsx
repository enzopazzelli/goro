"use client";

import { useActionState } from "react";
import { Boton } from "@/componentes/Boton";
import { Insignia } from "@/componentes/Insignia";
import { horaDe } from "@/lib/fechas";
import { formatearPlata } from "@/lib/plata";
import { anularMovimientoCaja } from "../consultas/acciones";
import { ETIQUETA_TIPO, esManual, type MovimientoCaja, type TipoMovimientoCaja } from "../tipos";

const INICIAL = { error: null };

const VARIANTE: Record<TipoMovimientoCaja, "ok" | "advertencia" | "alerta" | "neutra"> = {
  apertura: "neutra",
  venta: "ok",
  ingreso: "ok",
  gasto: "advertencia",
  retiro: "advertencia",
  anulacion: "alerta",
};

function detalleDe(movimiento: MovimientoCaja): string {
  if (movimiento.detalle) return movimiento.detalle;
  if (movimiento.ventaId) return `Venta #${movimiento.ventaId}`;
  return "Fondo de caja";
}

export function FilaMovimiento({
  movimiento,
  quien,
  sePuedeAnular,
}: {
  movimiento: MovimientoCaja;
  /** Undefined para el colaborador: RLS de perfiles no le deja ver nombres ajenos. */
  quien?: string;
  sePuedeAnular: boolean;
}) {
  const [estado, accion, enviando] = useActionState(anularMovimientoCaja, INICIAL);
  const anulable = sePuedeAnular && esManual(movimiento.tipo) && !movimiento.anulado;

  return (
    <tr className={`border-b border-linea last:border-0 ${movimiento.anulado ? "opacity-55" : ""}`}>
      <td className="numero p-2 text-texto-suave">{horaDe(movimiento.creadoEn)}</td>
      <td className="p-2">
        <Insignia variante={VARIANTE[movimiento.tipo]}>{ETIQUETA_TIPO[movimiento.tipo]}</Insignia>
      </td>
      <td className={`p-2 ${movimiento.anulado ? "line-through" : ""}`}>
        {detalleDe(movimiento)}
        {quien && <span className="text-texto-suave"> · {quien}</span>}
      </td>
      <td
        className={`numero p-2 text-right ${movimiento.anulado ? "line-through" : ""} ${
          movimiento.monto < 0 ? "text-alerta" : ""
        }`}
      >
        {formatearPlata(movimiento.monto)}
      </td>
      <td className="p-2 text-right">
        {movimiento.anulado && <span className="text-xs text-texto-suave">Anulado</span>}
        {anulable && (
          <form action={accion}>
            <input type="hidden" name="movimientoId" value={movimiento.id} />
            <Boton type="submit" variante="peligro" tamano="chico" disabled={enviando}>
              {enviando ? "Anulando…" : "Anular"}
            </Boton>
          </form>
        )}
        {estado.error && (
          <span role="alert" className="text-xs text-alerta">
            {estado.error}
          </span>
        )}
      </td>
    </tr>
  );
}
