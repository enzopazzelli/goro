"use client";

import { useActionState } from "react";
import { cambiarActivoSabor } from "../consultas/accionesSabores";

const INICIAL = { error: null };

export function BotonActivoSabor({ saborId, activo }: { saborId: number; activo: boolean }) {
  const [estado, accion, enviando] = useActionState(cambiarActivoSabor, INICIAL);

  return (
    <form action={accion} className="flex items-center gap-2">
      <input type="hidden" name="saborId" value={saborId} />
      <input type="hidden" name="activo" value={(!activo).toString()} />
      <button type="submit" disabled={enviando} className="text-xs underline opacity-70">
        {enviando ? "Guardando…" : activo ? "Desactivar" : "Activar"}
      </button>
      {estado.error && (
        <span role="alert" className="text-xs text-alerta">
          {estado.error}
        </span>
      )}
    </form>
  );
}
