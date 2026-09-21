"use client";

import { useActionState } from "react";
import { abrirBalde } from "@/lib/accionesBaldes";

const INICIAL = { error: null };

export function BotonAbrirBalde({ baldeId }: { baldeId: number }) {
  const [estado, accion, enviando] = useActionState(abrirBalde, INICIAL);

  return (
    <form action={accion} className="flex items-center gap-2">
      <input type="hidden" name="baldeId" value={baldeId} />
      <button
        type="submit"
        disabled={enviando}
        className="rounded-(--r) bg-acento px-2 py-1 text-xs font-semibold text-acento-texto disabled:opacity-45"
      >
        {enviando ? "Abriendo…" : "Abrir"}
      </button>
      {estado.error && (
        <span role="alert" className="text-xs text-alerta">
          {estado.error}
        </span>
      )}
    </form>
  );
}
