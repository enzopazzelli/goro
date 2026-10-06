"use client";

import { useActionState } from "react";
import { Boton } from "@/componentes/Boton";
import { CampoChico } from "@/componentes/CampoChico";
import { editarStockMinimo } from "../consultas/accionesSabores";

const INICIAL = { error: null };

/** El mínimo de alerta de este sabor; vacío usa el del comercio. */
export function FormularioMinimo({
  saborId,
  valorActual,
}: {
  saborId: number;
  valorActual: number | null;
}) {
  const [estado, accion, enviando] = useActionState(editarStockMinimo, INICIAL);

  return (
    <form action={accion} className="flex items-end gap-2">
      <input type="hidden" name="saborId" value={saborId} />
      <CampoChico
        etiqueta="Mínimo (kg)"
        type="number"
        name="stockMinimo"
        step="0.1"
        min="0"
        defaultValue={valorActual ?? ""}
        placeholder="el del comercio"
        className="numero w-32"
        disabled={enviando}
      />
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
