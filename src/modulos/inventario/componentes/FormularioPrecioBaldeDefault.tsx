"use client";

import { useActionState } from "react";
import { Boton } from "@/componentes/Boton";
import { editarPrecioBaldeDefault } from "@/lib/accionesConfigComercio";
import { seleccionarAlEnfocar } from "@/lib/seleccionarAlEnfocar";

const INICIAL = { error: null };

export function FormularioPrecioBaldeDefault({ valorActual }: { valorActual: number | null }) {
  const [estado, accion, enviando] = useActionState(editarPrecioBaldeDefault, INICIAL);

  return (
    <form action={accion} className="flex flex-wrap items-center gap-2 text-sm">
      <label className="flex items-center gap-2" htmlFor="precio-balde-default">
        <span className="text-xs font-semibold tracking-wide text-texto-suave uppercase">
          Precio del balde entero ($)
        </span>
        <input
          id="precio-balde-default"
          type="number"
          onFocus={seleccionarAlEnfocar}
          name="precioBaldeDefault"
          step="1"
          min="1"
          defaultValue={valorActual ?? ""}
          placeholder="sin precio"
          disabled={enviando}
          className="numero w-28 rounded-(--r) border border-linea bg-superficie px-2 py-1 text-sm"
        />
      </label>
      <Boton type="submit" variante="suave" tamano="chico" disabled={enviando}>
        {enviando ? "Guardando…" : "Guardar"}
      </Boton>
      {estado.error && (
        <span role="alert" className="text-xs text-alerta">
          {estado.error}
        </span>
      )}
      <p className="w-full text-xs text-texto-suave">
        Vale para todos los sabores que no tengan uno propio (se pone desde cada sabor). Sin precio
        no se puede vender un balde entero.
      </p>
    </form>
  );
}
