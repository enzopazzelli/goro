"use client";

import { useActionState } from "react";
import type { ConsumoDeFormato, Insumo } from "../tipos";
import { agregarConsumo, quitarConsumo } from "../consultas/accionesFormatos";

const INICIAL = { error: null };

export function ConsumoFormato({
  formatoId,
  consumos,
  insumos,
  esDuenio,
}: {
  formatoId: number;
  consumos: ConsumoDeFormato[];
  insumos: Insumo[];
  esDuenio: boolean;
}) {
  const [estadoAgregar, accionAgregar, agregando] = useActionState(agregarConsumo, INICIAL);
  const [estadoQuitar, accionQuitar, quitando] = useActionState(quitarConsumo, INICIAL);
  // Solo insumos que se cuentan por unidad: un formato consume "1 cono", no "0,3 kg".
  const elegibles = insumos.filter((insumo) => insumo.activo && insumo.unidad === "u");

  return (
    <div className="flex flex-wrap items-center gap-2 pl-2 text-xs">
      <span className="text-texto-suave">Consume:</span>
      {consumos.length === 0 && <span className="text-texto-suave">nada</span>}
      {consumos.map((consumo) =>
        esDuenio ? (
          <form key={consumo.insumoId} action={accionQuitar} className="flex items-center gap-1">
            <input type="hidden" name="formatoId" value={formatoId} />
            <input type="hidden" name="insumoId" value={consumo.insumoId} />
            <span>
              {consumo.insumoNombre} × {consumo.cantidad}
            </span>
            <button
              type="submit"
              disabled={quitando}
              aria-label={`Quitar ${consumo.insumoNombre}`}
              className="text-texto-suave hover:text-alerta"
            >
              ✕
            </button>
          </form>
        ) : (
          <span key={consumo.insumoId}>
            {consumo.insumoNombre} × {consumo.cantidad}
          </span>
        ),
      )}

      {esDuenio && (
        <form action={accionAgregar} className="flex items-center gap-1">
          <input type="hidden" name="formatoId" value={formatoId} />
          <select
            name="insumoId"
            aria-label="Insumo que consume"
            disabled={agregando}
            className="rounded-(--r) border border-linea bg-superficie px-2 py-1"
          >
            {elegibles.map((insumo) => (
              <option key={insumo.id} value={insumo.id}>
                {insumo.nombre}
              </option>
            ))}
          </select>
          <input
            type="number"
            name="cantidad"
            min="1"
            defaultValue={1}
            aria-label="Cantidad"
            disabled={agregando}
            className="numero w-14 rounded-(--r) border border-linea bg-superficie px-2 py-1"
          />
          <button type="submit" disabled={agregando} className="underline opacity-70">
            Agregar
          </button>
        </form>
      )}

      {(estadoAgregar.error || estadoQuitar.error) && (
        <span role="alert" className="text-alerta">
          {estadoAgregar.error ?? estadoQuitar.error}
        </span>
      )}
    </div>
  );
}
