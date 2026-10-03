"use client";

import { useActionState } from "react";
import { Boton } from "@/componentes/Boton";
import { CampoChico } from "@/componentes/CampoChico";
import { Insignia } from "@/componentes/Insignia";
import type { Formato } from "@/lib/formatos";
import { formatearPlata } from "@/lib/plata";
import { editarFormato, eliminarFormato } from "../consultas/accionesFormatos";

const INICIAL = { error: null };

export function FilaFormato({ formato, esDuenio }: { formato: Formato; esDuenio: boolean }) {
  const [estadoEdicion, accionEditar, editando] = useActionState(editarFormato, INICIAL);
  const [estadoBorrado, accionBorrar, borrando] = useActionState(eliminarFormato, INICIAL);

  if (!esDuenio) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-(--r) border border-linea p-2 text-sm">
        <span className="font-semibold">{formato.nombre}</span>
        <span className="text-texto-suave">
          {formato.gramos} g · {formato.cantidadSabores} sabor
          {formato.cantidadSabores > 1 ? "es" : ""}
        </span>
        <span className="numero">{formatearPlata(formato.precio)}</span>
        {!formato.activo && <Insignia variante="neutra">Inactivo</Insignia>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-(--r) border border-linea p-2">
      <form action={accionEditar} className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <input type="hidden" name="formatoId" value={formato.id} />
        <CampoChico
          etiqueta="Nombre"
          name="nombre"
          defaultValue={formato.nombre}
          disabled={editando}
          className="w-44"
        />
        <CampoChico
          etiqueta="Gramos de helado"
          type="number"
          name="gramos"
          min="1"
          defaultValue={formato.gramos}
          disabled={editando}
          className="numero w-28"
        />
        <CampoChico
          etiqueta="Cantidad de sabores"
          type="number"
          name="cantidadSabores"
          min="1"
          defaultValue={formato.cantidadSabores}
          disabled={editando}
          className="numero w-28"
        />
        <CampoChico
          etiqueta="Precio con helado"
          type="number"
          name="precio"
          min="0"
          defaultValue={formato.precio}
          disabled={editando}
          className="numero w-28"
        />
        <label className="flex items-center gap-1 pb-1 text-xs">
          <input
            type="checkbox"
            name="activo"
            defaultChecked={formato.activo}
            disabled={editando}
          />
          A la venta
        </label>
        <button type="submit" disabled={editando} className="pb-1 text-xs underline opacity-70">
          {editando ? "Guardando…" : "Guardar"}
        </button>
        {estadoEdicion.error && (
          <span role="alert" className="pb-1 text-xs text-alerta">
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
