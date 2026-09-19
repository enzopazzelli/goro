"use client";

import { useActionState } from "react";
import { editarStockMinimo } from "../consultas/acciones";

const INICIAL = { error: null };

export function FormularioMinimo({
  saborId,
  valorActual,
}: {
  saborId: number;
  valorActual: number | null;
}) {
  const [estado, accion, enviando] = useActionState(editarStockMinimo, INICIAL);

  return (
    <form action={accion} className="flex items-center gap-2">
      <input type="hidden" name="saborId" value={saborId} />
      <input
        type="number"
        name="stockMinimo"
        step="0.1"
        min="0"
        defaultValue={valorActual ?? ""}
        placeholder="default"
        aria-label="Mínimo en kg"
        className="numero w-20 rounded-(--r) border border-linea bg-superficie px-2 py-1 text-sm"
        disabled={enviando}
      />
      <button type="submit" disabled={enviando} className="text-xs underline opacity-70">
        Guardar
      </button>
      {estado.error && (
        <span role="alert" className="text-xs text-alerta">
          {estado.error}
        </span>
      )}
    </form>
  );
}
