"use client";

import { useActionState } from "react";
import { Boton } from "@/componentes/Boton";
import { CampoChico } from "@/componentes/CampoChico";
import { editarPrecioBalde } from "../consultas/accionesSabores";

const INICIAL = { error: null };

/** El precio del balde entero de este sabor; vacío usa el del comercio. */
export function FormularioPrecioBalde({
  saborId,
  valorActual,
}: {
  saborId: number;
  valorActual: number | null;
}) {
  const [estado, accion, enviando] = useActionState(editarPrecioBalde, INICIAL);

  return (
    <form action={accion} className="flex items-end gap-2">
      <input type="hidden" name="saborId" value={saborId} />
      <CampoChico
        etiqueta="Precio balde entero ($)"
        type="number"
        name="precioBalde"
        step="1"
        min="1"
        defaultValue={valorActual ?? ""}
        placeholder="el del comercio"
        className="numero w-36"
        disabled={enviando}
      />
      <Boton type="submit" variante="suave" tamano="chico" disabled={enviando}>
        Guardar precio
      </Boton>
      {estado.error && (
        <span role="alert" className="text-xs text-alerta">
          {estado.error}
        </span>
      )}
    </form>
  );
}
