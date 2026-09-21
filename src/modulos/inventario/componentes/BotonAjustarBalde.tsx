"use client";

import { useActionState } from "react";
import { registrarAjusteBalde } from "../consultas/acciones";

const INICIAL = { error: null };

export function BotonAjustarBalde({ baldeId }: { baldeId: number }) {
  const [estado, accion, enviando] = useActionState(registrarAjusteBalde, INICIAL);

  return (
    <form action={accion} className="flex items-center gap-2">
      <input type="hidden" name="baldeId" value={baldeId} />
      <input
        type="number"
        name="kg"
        step="0.01"
        aria-label="Ajuste en kg (positivo o negativo)"
        placeholder="± kg"
        disabled={enviando}
        className="numero w-16 rounded-(--r) border border-linea bg-superficie px-2 py-1 text-xs"
      />
      <button type="submit" disabled={enviando} className="text-xs underline opacity-70">
        {enviando ? "Ajustando…" : "Ajustar"}
      </button>
      {estado.error && (
        <span role="alert" className="text-xs text-alerta">
          {estado.error}
        </span>
      )}
    </form>
  );
}
