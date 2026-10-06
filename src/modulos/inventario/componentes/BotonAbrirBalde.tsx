"use client";

import { useActionState } from "react";
import { Boton } from "@/componentes/Boton";
import { abrirBalde } from "@/lib/accionesBaldes";

const INICIAL = { error: null };

export function BotonAbrirBalde({ baldeId }: { baldeId: number }) {
  const [estado, accion, enviando] = useActionState(abrirBalde, INICIAL);

  return (
    <form action={accion} className="flex items-center gap-2">
      <input type="hidden" name="baldeId" value={baldeId} />
      <Boton type="submit" tamano="chico" disabled={enviando}>
        {enviando ? "Abriendo…" : "Abrir"}
      </Boton>
      {estado.error && (
        <span role="alert" className="text-xs text-alerta">
          {estado.error}
        </span>
      )}
    </form>
  );
}
