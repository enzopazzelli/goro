"use client";

import { useActionState } from "react";
import type { Presentacion } from "@/lib/presentaciones";
import { editarPresentacion } from "../consultas/acciones";

const INICIAL = { error: null };

export function FilaPresentacion({ presentacion }: { presentacion: Presentacion }) {
  const [estado, accion, guardando] = useActionState(editarPresentacion, INICIAL);

  return (
    <form action={accion} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="presentacionId" value={presentacion.id} />
      <input
        type="text"
        name="nombre"
        defaultValue={presentacion.nombre}
        aria-label="Nombre de la presentación"
        disabled={guardando}
        className="w-28 rounded-(--r) border border-linea bg-superficie px-2 py-1 text-sm"
      />
      <input
        type="number"
        name="unidades"
        min="1"
        defaultValue={presentacion.unidades}
        aria-label="Unidades que descuenta"
        disabled={guardando}
        className="numero w-16 rounded-(--r) border border-linea bg-superficie px-2 py-1 text-sm"
      />
      <input
        type="number"
        name="precio"
        min="0"
        defaultValue={presentacion.precio}
        aria-label="Precio"
        disabled={guardando}
        className="numero w-24 rounded-(--r) border border-linea bg-superficie px-2 py-1 text-sm"
      />
      <label className="flex items-center gap-1 text-xs">
        <input
          type="checkbox"
          name="activo"
          defaultChecked={presentacion.activo}
          disabled={guardando}
        />
        A la venta
      </label>
      <button type="submit" disabled={guardando} className="text-xs underline opacity-70">
        {guardando ? "Guardando…" : "Guardar"}
      </button>
      {estado.error && (
        <span role="alert" className="text-xs text-alerta">
          {estado.error}
        </span>
      )}
    </form>
  );
}
