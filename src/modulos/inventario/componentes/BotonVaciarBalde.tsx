"use client";

import { useActionState } from "react";
import { Boton } from "@/componentes/Boton";
import { vaciarBalde } from "../consultas/accionesCicloBalde";

const INICIAL = { error: null };

/**
 * "Se terminó": el balde sale del mostrador y queda esperando el canje. Si el
 * sistema creía que quedaban kilos, se dice antes de confirmar: esos kilos se
 * dan de baja, y es mejor enterarse acá que mirando el stock después.
 */
export function BotonVaciarBalde({
  baldeId,
  codigo,
  kgRestante,
}: {
  baldeId: number;
  codigo: string;
  kgRestante: number;
}) {
  const [estado, accion, enviando] = useActionState(vaciarBalde, INICIAL);

  const aviso =
    kgRestante > 0
      ? `El sistema creía que en el balde ${codigo} quedaban ${kgRestante} kg. Si se terminó, esos kilos se dan de baja. ¿Se terminó?`
      : `¿Se terminó el balde ${codigo}?`;

  return (
    <form
      action={accion}
      onSubmit={(evento) => {
        if (!confirm(aviso)) evento.preventDefault();
      }}
      className="flex items-center gap-2"
    >
      <input type="hidden" name="baldeId" value={baldeId} />
      <Boton type="submit" variante="peligro" tamano="chico" disabled={enviando}>
        {enviando ? "Guardando…" : "Se terminó"}
      </Boton>
      {estado.error && (
        <span role="alert" className="text-xs text-alerta">
          {estado.error}
        </span>
      )}
    </form>
  );
}
