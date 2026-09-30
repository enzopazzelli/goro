"use client";

import { useActionState } from "react";
import { CampoChico } from "@/componentes/CampoChico";
import { etiquetaPresentacion } from "@/lib/etiquetaPresentacion";
import type { Presentacion } from "@/lib/presentaciones";
import { editarPresentacion } from "../consultas/acciones";

const INICIAL = { error: null };

export function FilaPresentacion({ presentacion }: { presentacion: Presentacion }) {
  const [estado, accion, guardando] = useActionState(editarPresentacion, INICIAL);

  return (
    <form action={accion} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="presentacionId" value={presentacion.id} />
      <span className="w-28 pb-1 text-sm font-semibold">
        {etiquetaPresentacion(presentacion.nombre, presentacion.unidades)}
      </span>
      <CampoChico
        etiqueta="Nombre"
        name="nombre"
        defaultValue={presentacion.nombre}
        disabled={guardando}
        className="w-28"
      />
      <CampoChico
        etiqueta="Unidades (×)"
        type="number"
        name="unidades"
        min="1"
        defaultValue={presentacion.unidades}
        disabled={guardando}
        className="numero w-20"
      />
      <CampoChico
        etiqueta="Precio de venta"
        type="number"
        name="precio"
        min="0"
        defaultValue={presentacion.precio}
        disabled={guardando}
        className="numero w-28"
      />
      <label className="flex items-center gap-1 pb-1 text-xs">
        <input
          type="checkbox"
          name="activo"
          defaultChecked={presentacion.activo}
          disabled={guardando}
        />
        A la venta
      </label>
      <button type="submit" disabled={guardando} className="pb-1 text-xs underline opacity-70">
        {guardando ? "Guardando…" : "Guardar"}
      </button>
      {estado.error && (
        <span role="alert" className="pb-1 text-xs text-alerta">
          {estado.error}
        </span>
      )}
    </form>
  );
}
