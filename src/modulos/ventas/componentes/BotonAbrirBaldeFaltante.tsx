"use client";

import { useActionState } from "react";
import { Boton } from "@/componentes/Boton";
import { abrirBalde } from "@/lib/accionesBaldes";

const INICIAL = { error: null };

export function BotonAbrirBaldeFaltante({
  baldeId,
  saborNombre,
}: {
  baldeId: number;
  saborNombre: string;
}) {
  const [estado, accion, enviando] = useActionState(abrirBalde, INICIAL);

  return (
    <form action={accion} className="flex items-center gap-2">
      <input type="hidden" name="baldeId" value={baldeId} />
      <Boton type="submit" tamano="chico" disabled={enviando}>
        {enviando ? "Abriendo…" : `Abrir balde de ${saborNombre}`}
      </Boton>
      {estado.error && (
        <span role="alert" className="text-xs text-alerta">
          {estado.error}
        </span>
      )}
    </form>
  );
}
