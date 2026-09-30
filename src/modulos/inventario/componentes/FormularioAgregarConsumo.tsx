"use client";

import { useActionState } from "react";
import type { Insumo } from "../tipos";
import { agregarConsumo } from "../consultas/accionesFormatos";

const INICIAL = { error: null };

export function FormularioAgregarConsumo({
  formatoId,
  elegibles,
}: {
  formatoId: number;
  elegibles: Insumo[];
}) {
  const [estado, accion, agregando] = useActionState(agregarConsumo, INICIAL);

  return (
    <>
      <form action={accion} className="flex items-center gap-1">
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
      {estado.error && (
        <span role="alert" className="text-alerta">
          {estado.error}
        </span>
      )}
    </>
  );
}
