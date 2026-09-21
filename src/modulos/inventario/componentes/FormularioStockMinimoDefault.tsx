"use client";

import { useActionState } from "react";
import { editarStockMinimoDefault } from "@/lib/accionesConfigComercio";

const INICIAL = { error: null };

export function FormularioStockMinimoDefault({ valorActual }: { valorActual: number }) {
  const [estado, accion, enviando] = useActionState(editarStockMinimoDefault, INICIAL);

  return (
    <form action={accion} className="flex items-center gap-2 text-sm">
      <label className="flex items-center gap-2" htmlFor="stock-minimo-default">
        <span className="text-xs font-semibold tracking-wide text-texto-suave uppercase">
          Mínimo de alerta por defecto (kg)
        </span>
        <input
          id="stock-minimo-default"
          type="number"
          name="stockMinimoDefault"
          step="0.1"
          min="0"
          defaultValue={valorActual}
          disabled={enviando}
          className="numero w-20 rounded-(--r) border border-linea bg-superficie px-2 py-1 text-sm"
        />
      </label>
      <button type="submit" disabled={enviando} className="text-xs underline opacity-70">
        {enviando ? "Guardando…" : "Guardar"}
      </button>
      {estado.error && (
        <span role="alert" className="text-xs text-alerta">
          {estado.error}
        </span>
      )}
    </form>
  );
}
