"use client";

import { useActionState } from "react";
import { Boton } from "@/componentes/Boton";
import { eliminarBalde } from "../consultas/acciones";

const INICIAL = { error: null };

export function BotonBorrarBalde({ baldeId, codigo }: { baldeId: number; codigo: string }) {
  const [estado, accion, enviando] = useActionState(eliminarBalde, INICIAL);

  return (
    <form
      action={accion}
      onSubmit={(evento) => {
        if (!confirm(`¿Borrar el balde ${codigo}?`)) evento.preventDefault();
      }}
      className="flex items-center gap-2"
    >
      <input type="hidden" name="baldeId" value={baldeId} />
      <Boton type="submit" variante="peligro" disabled={enviando}>
        {enviando ? "Borrando…" : "Borrar"}
      </Boton>
      {estado.error && (
        <span role="alert" className="text-xs text-alerta">
          {estado.error}
        </span>
      )}
    </form>
  );
}
