"use client";

import { useActionState } from "react";
import { editarNombreSabor } from "../consultas/accionesSabores";

const INICIAL = { error: null };

export function EditorNombreSabor({
  saborId,
  nombreActual,
}: {
  saborId: number;
  nombreActual: string;
}) {
  const [estado, accion, enviando] = useActionState(editarNombreSabor, INICIAL);

  return (
    <form action={accion} className="flex items-center gap-2">
      <input type="hidden" name="saborId" value={saborId} />
      <input
        type="text"
        name="nombre"
        defaultValue={nombreActual}
        aria-label="Nombre del sabor"
        disabled={enviando}
        className="rounded-(--r) border border-linea bg-superficie px-2 py-1 text-sm"
      />
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
