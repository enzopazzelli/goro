"use client";

import { useActionState } from "react";
import type { Sabor } from "@/lib/sabores";
import type { SaborDeItem } from "../tipos";
import { corregirSaborVentaItem } from "../consultas/acciones";

const INICIAL = { error: null };

export function CorregirSaborItem({
  ventaItemId,
  saborActual,
  sabores,
  disabled,
}: {
  ventaItemId: number;
  saborActual: SaborDeItem;
  sabores: Sabor[];
  disabled: boolean;
}) {
  const [estado, accion, enviando] = useActionState(corregirSaborVentaItem, INICIAL);

  return (
    <form action={accion} className="flex items-center gap-1 text-xs">
      <input type="hidden" name="ventaItemId" value={ventaItemId} />
      <input type="hidden" name="saborViejoId" value={saborActual.saborId} />
      <span className="text-texto-suave">{saborActual.saborNombre} →</span>
      <select
        name="saborNuevoId"
        defaultValue=""
        disabled={disabled || enviando}
        className="rounded-(--r) border border-linea bg-superficie px-1 py-0.5 text-xs"
      >
        <option value="" disabled>
          cambiar a…
        </option>
        {sabores
          .filter((sabor) => sabor.activo && sabor.id !== saborActual.saborId)
          .map((sabor) => (
            <option key={sabor.id} value={sabor.id}>
              {sabor.nombre}
            </option>
          ))}
      </select>
      <button type="submit" disabled={disabled || enviando} className="underline opacity-70">
        {enviando ? "…" : "OK"}
      </button>
      {estado.error && (
        <span role="alert" className="text-alerta">
          {estado.error}
        </span>
      )}
    </form>
  );
}
