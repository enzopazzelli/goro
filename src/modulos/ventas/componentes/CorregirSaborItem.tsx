"use client";

import { useActionState } from "react";
import { Boton } from "@/componentes/Boton";
import { Punto } from "@/componentes/Punto";
import type { Sabor } from "@/lib/sabores";
import type { SaborDeItem } from "../tipos";
import { corregirSaborVentaItem } from "../consultas/acciones";

const INICIAL = { error: null };

export function CorregirSaborItem({
  ventaItemId,
  saborActual,
  sabores,
  disabled,
}: {
  ventaItemId: number;
  saborActual: SaborDeItem;
  sabores: Sabor[];
  disabled: boolean;
}) {
  const [estado, accion, enviando] = useActionState(corregirSaborVentaItem, INICIAL);
  const colorActual = sabores.find((sabor) => sabor.id === saborActual.saborId)?.color;

  return (
    <form action={accion} className="flex items-center gap-1.5 text-xs">
      <input type="hidden" name="ventaItemId" value={ventaItemId} />
      <input type="hidden" name="saborViejoId" value={saborActual.saborId} />
      <span className="flex items-center gap-1 rounded-full bg-superficie-honda px-2 py-0.5">
        <Punto color={colorActual ?? "var(--texto-suave)"} />
        {saborActual.saborNombre}
      </span>
      <span aria-hidden="true" className="text-texto-suave">
        ⇄
      </span>
      <select
        name="saborNuevoId"
        defaultValue=""
        disabled={disabled || enviando}
        className="rounded-(--r) border border-linea bg-superficie px-1.5 py-0.5 text-xs"
      >
        <option value="" disabled>
          cambiar a…
        </option>
        {sabores
          .filter((sabor) => sabor.activo && sabor.id !== saborActual.saborId)
          .map((sabor) => (
            <option key={sabor.id} value={sabor.id}>
              {sabor.nombre}
            </option>
          ))}
      </select>
      <Boton type="submit" variante="suave" disabled={disabled || enviando} className="px-2 py-0.5">
        {enviando ? "…" : "Cambiar"}
      </Boton>
      {estado.error && (
        <span role="alert" className="text-alerta">
          {estado.error}
        </span>
      )}
    </form>
  );
}
