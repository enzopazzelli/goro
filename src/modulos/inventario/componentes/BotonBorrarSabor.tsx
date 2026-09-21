"use client";

import { useActionState } from "react";
import { Boton } from "@/componentes/Boton";
import { eliminarSabor } from "../consultas/accionesSabores";

const INICIAL = { error: null };

export function BotonBorrarSabor({ saborId, nombre }: { saborId: number; nombre: string }) {
  const [estado, accion, enviando] = useActionState(eliminarSabor, INICIAL);

  return (
    <form
      action={accion}
      onSubmit={(evento) => {
        if (!confirm(`¿Borrar el sabor "${nombre}"?`)) evento.preventDefault();
      }}
      className="flex items-center gap-2"
    >
      <input type="hidden" name="saborId" value={saborId} />
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
