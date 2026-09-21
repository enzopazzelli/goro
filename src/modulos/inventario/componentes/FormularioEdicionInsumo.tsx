"use client";

import { useActionState } from "react";
import { Boton } from "@/componentes/Boton";
import type { Insumo } from "../tipos";
import { editarInsumo, eliminarInsumo } from "../consultas/accionesInsumos";

const INICIAL = { error: null };

export function FormularioEdicionInsumo({ insumo }: { insumo: Insumo }) {
  const [estadoEdicion, accionEditar, editando] = useActionState(editarInsumo, INICIAL);
  const [estadoBorrado, accionBorrar, borrando] = useActionState(eliminarInsumo, INICIAL);

  return (
    <div className="flex flex-col gap-2">
      <form action={accionEditar} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="insumoId" value={insumo.id} />
        <input
          type="text"
          name="nombre"
          defaultValue={insumo.nombre}
          aria-label="Nombre"
          disabled={editando}
          className="rounded-(--r) border border-linea bg-superficie px-2 py-1 text-sm"
        />
        <select
          name="unidad"
          defaultValue={insumo.unidad}
          disabled={editando}
          className="rounded-(--r) border border-linea bg-superficie px-2 py-1 text-sm"
        >
          <option value="u">Unidad</option>
          <option value="kg">Kilo</option>
        </select>
        <input
          type="number"
          name="minimo"
          min="0"
          defaultValue={insumo.minimo}
          aria-label="Mínimo"
          disabled={editando}
          className="numero w-20 rounded-(--r) border border-linea bg-superficie px-2 py-1 text-sm"
        />
        <input
          type="number"
          name="costo"
          min="0"
          defaultValue={insumo.costo}
          aria-label="Costo"
          disabled={editando}
          className="numero w-24 rounded-(--r) border border-linea bg-superficie px-2 py-1 text-sm"
        />
        <button type="submit" disabled={editando} className="text-xs underline opacity-70">
          {editando ? "Guardando…" : "Guardar"}
        </button>
        {estadoEdicion.error && (
          <span role="alert" className="text-xs text-alerta">
            {estadoEdicion.error}
          </span>
        )}
      </form>

      <form
        action={accionBorrar}
        onSubmit={(evento) => {
          if (!confirm(`¿Borrar el insumo "${insumo.nombre}"?`)) evento.preventDefault();
        }}
        className="flex items-center gap-2"
      >
        <input type="hidden" name="insumoId" value={insumo.id} />
        <Boton type="submit" variante="peligro" disabled={borrando}>
          {borrando ? "Borrando…" : "Borrar"}
        </Boton>
        {estadoBorrado.error && (
          <span role="alert" className="text-xs text-alerta">
            {estadoBorrado.error}
          </span>
        )}
      </form>
    </div>
  );
}
