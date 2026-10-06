"use client";

import { useActionState } from "react";
import { Boton } from "@/componentes/Boton";
import { CampoChico } from "@/componentes/CampoChico";
import { registrarAjusteBalde } from "../consultas/acciones";

const INICIAL = { error: null };

export function BotonAjustarBalde({ baldeId }: { baldeId: number }) {
  const [estado, accion, enviando] = useActionState(registrarAjusteBalde, INICIAL);

  return (
    <form action={accion} className="flex items-end gap-2">
      <input type="hidden" name="baldeId" value={baldeId} />
      <CampoChico
        etiqueta="Ajuste (± kg)"
        type="number"
        name="kg"
        step="0.01"
        placeholder="-0.5"
        disabled={enviando}
        className="numero w-24"
      />
      <Boton type="submit" variante="suave" tamano="chico" disabled={enviando}>
        {enviando ? "Ajustando…" : "Ajustar"}
      </Boton>
      {estado.error && (
        <span role="alert" className="text-xs text-alerta">
          {estado.error}
        </span>
      )}
    </form>
  );
}
