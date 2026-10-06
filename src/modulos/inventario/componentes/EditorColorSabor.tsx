"use client";

import { useActionState } from "react";
import { Boton } from "@/componentes/Boton";
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
    <form action={accion} className="flex items-end gap-2">
      <input type="hidden" name="saborId" value={saborId} />
      <label className="flex flex-col gap-1">
        <span className="font-mono text-xs tracking-wide text-texto-suave uppercase">Color</span>
        <input
          type="color"
          name="color"
          defaultValue={colorActual}
          disabled={enviando}
          className="h-9 w-12 rounded-(--r) border border-linea bg-superficie p-0.5"
        />
      </label>
      <Boton type="submit" variante="suave" tamano="chico" disabled={enviando}>
        Guardar
      </Boton>
      {estado.error && (
        <span role="alert" className="text-xs text-alerta">
          {estado.error}
        </span>
      )}
    </form>
  );
}
