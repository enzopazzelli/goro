"use client";

import { useActionState } from "react";
import type { Formato } from "../tipos";
import { editarFormato, eliminarFormato } from "../consultas/accionesFormatos";

const INICIAL = { error: null };

export function FilaFormato({ formato, esDuenio }: { formato: Formato; esDuenio: boolean }) {
  const [estadoEdicion, accionEditar, editando] = useActionState(editarFormato, INICIAL);
  const [estadoBorrado, accionBorrar, borrando] = useActionState(eliminarFormato, INICIAL);

  if (!esDuenio) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-(--r) border border-linea p-3 text-sm">
        <span className="font-semibold">{formato.nombre}</span>
        <span className="text-texto-suave">{formato.gramos} g</span>
        <span className="text-texto-suave">{formato.cantidadSabores} sabores</span>
        <span className="numero">${formato.precio}</span>
        {!formato.activo && <span className="text-xs text-texto-suave">(inactivo)</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-(--r) border border-linea p-3">
      <form action={accionEditar} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="formatoId" value={formato.id} />
        <input
          type="text"
          name="nombre"
          defaultValue={formato.nombre}
          aria-label="Nombre"
          disabled={editando}
          className="rounded-(--r) border border-linea bg-superficie px-2 py-1 text-sm"
        />
        <input
          type="number"
          name="gramos"
          min="1"
          defaultValue={formato.gramos}
          aria-label="Gramos"
          disabled={editando}
          className="numero w-20 rounded-(--r) border border-linea bg-superficie px-2 py-1 text-sm"
        />
        <input
          type="number"
          name="cantidadSabores"
          min="1"
          defaultValue={formato.cantidadSabores}
          aria-label="Cantidad de sabores"
          disabled={editando}
          className="numero w-16 rounded-(--r) border border-linea bg-superficie px-2 py-1 text-sm"
        />
        <input
          type="number"
          name="precio"
          min="0"
          defaultValue={formato.precio}
          aria-label="Precio"
          disabled={editando}
          className="numero w-24 rounded-(--r) border border-linea bg-superficie px-2 py-1 text-sm"
        />
        <label className="flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            name="activo"
            defaultChecked={formato.activo}
            disabled={editando}
          />
          Activo
        </label>
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
          if (!confirm(`¿Borrar el formato "${formato.nombre}"?`)) evento.preventDefault();
        }}
        className="flex items-center gap-2"
      >
        <input type="hidden" name="formatoId" value={formato.id} />
        <button type="submit" disabled={borrando} className="text-xs text-alerta underline">
          {borrando ? "Borrando…" : "Borrar"}
        </button>
        {estadoBorrado.error && (
          <span role="alert" className="text-xs text-alerta">
            {estadoBorrado.error}
          </span>
        )}
      </form>
    </div>
  );
}
