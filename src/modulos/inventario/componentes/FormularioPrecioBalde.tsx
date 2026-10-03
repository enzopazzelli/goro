"use client";

import { useActionState } from "react";
import { seleccionarAlEnfocar } from "@/lib/seleccionarAlEnfocar";
import { editarPrecioBalde } from "../consultas/accionesSabores";

const INICIAL = { error: null };

/** El precio del balde entero de este sabor; vacío usa el del comercio. */
export function FormularioPrecioBalde({
  saborId,
  valorActual,
}: {
  saborId: number;
  valorActual: number | null;
}) {
  const [estado, accion, enviando] = useActionState(editarPrecioBalde, INICIAL);

  return (
    <form action={accion} className="flex items-center gap-2">
      <input type="hidden" name="saborId" value={saborId} />
      <input
        type="number"
        onFocus={seleccionarAlEnfocar}
        name="precioBalde"
        step="1"
        min="1"
        defaultValue={valorActual ?? ""}
        placeholder="default"
        aria-label="Precio del balde entero"
        className="numero w-24 rounded-(--r) border border-linea bg-superficie px-2 py-1 text-sm"
        disabled={enviando}
      />
      <button type="submit" disabled={enviando} className="text-xs underline opacity-70">
        Guardar precio
      </button>
      {estado.error && (
        <span role="alert" className="text-xs text-alerta">
          {estado.error}
        </span>
      )}
    </form>
  );
}
