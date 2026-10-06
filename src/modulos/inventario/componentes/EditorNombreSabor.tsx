"use client";

import { useActionState } from "react";
import { Boton } from "@/componentes/Boton";
import { CampoChico } from "@/componentes/CampoChico";
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
    <form action={accion} className="flex items-end gap-2">
      <input type="hidden" name="saborId" value={saborId} />
      <CampoChico
        etiqueta="Nombre"
        type="text"
        name="nombre"
        defaultValue={nombreActual}
        disabled={enviando}
      />
      <Boton type="submit" variante="suave" tamano="chico" disabled={enviando}>
        {enviando ? "Guardando…" : "Guardar"}
      </Boton>
      {estado.error && (
        <span role="alert" className="text-xs text-alerta">
          {estado.error}
        </span>
      )}
    </form>
  );
}
