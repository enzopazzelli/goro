"use client";

import { useActionState } from "react";
import { editarColorSabor } from "../consultas/accionesSabores";

const INICIAL = { error: null };

export function EditorColorSabor({
  saborId,
  colorActual,
}: {
  saborId: number;
  colorActual: string;
}) {
  const [estado, accion, enviando] = useActionState(editarColorSabor, INICIAL);

  return (
    <form action={accion} className="flex items-center gap-2">
      <input type="hidden" name="saborId" value={saborId} />
      <input
        type="color"
        name="color"
        defaultValue={colorActual}
        aria-label="Color del sabor"
        disabled={enviando}
        className="h-8 w-10 rounded-(--r) border border-linea bg-superficie p-0.5"
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
