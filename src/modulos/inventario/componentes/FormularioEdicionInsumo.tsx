"use client";

import { useActionState } from "react";
import { Boton } from "@/componentes/Boton";
import { CampoChico } from "@/componentes/CampoChico";
import type { Insumo } from "../tipos";
import { editarInsumo, eliminarInsumo } from "../consultas/accionesInsumos";

const INICIAL = { error: null };

/**
 * `conUnidad` es falso para productos y envases: siempre se cuentan por
 * unidad, así que no se ofrece cambiarla (se manda 'u' en un campo oculto).
 */
export function FormularioEdicionInsumo({
  insumo,
  conUnidad = true,
}: {
  insumo: Insumo;
  conUnidad?: boolean;
}) {
  const [estadoEdicion, accionEditar, editando] = useActionState(editarInsumo, INICIAL);
  const [estadoBorrado, accionBorrar, borrando] = useActionState(eliminarInsumo, INICIAL);

  return (
    <div className="flex flex-col gap-2">
      <form action={accionEditar} className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <input type="hidden" name="insumoId" value={insumo.id} />
        <CampoChico
          etiqueta="Nombre"
          name="nombre"
          defaultValue={insumo.nombre}
          disabled={editando}
          className="w-44"
        />
        {conUnidad ? (
          <label className="flex flex-col gap-0.5">
            <span className="font-mono text-xs tracking-wide text-texto-suave uppercase">
              Se cuenta en
            </span>
            <select
              name="unidad"
              defaultValue={insumo.unidad}
              disabled={editando}
              className="rounded-(--r) border border-linea bg-superficie px-2 py-1 text-sm"
            >
              <option value="u">Unidades</option>
              <option value="kg">Kilos</option>
            </select>
          </label>
        ) : (
          <input type="hidden" name="unidad" value="u" />
        )}
        <CampoChico
          etiqueta="Avisar al llegar a"
          type="number"
          name="minimo"
          min="0"
          defaultValue={insumo.minimo}
          disabled={editando}
          className="numero w-24"
        />
        <CampoChico
          etiqueta="Costo por unidad (lo que pagás)"
          type="number"
          name="costo"
          min="0"
          defaultValue={insumo.costo}
          disabled={editando}
          className="numero w-28"
        />
        <Boton type="submit" variante="suave" tamano="chico" disabled={editando}>
          {editando ? "Guardando…" : "Guardar"}
        </Boton>
        {estadoEdicion.error && (
          <span role="alert" className="pb-1 text-xs text-alerta">
            {estadoEdicion.error}
          </span>
        )}
      </form>

      <form
        action={accionBorrar}
        onSubmit={(evento) => {
          if (!confirm(`¿Borrar "${insumo.nombre}"?`)) evento.preventDefault();
        }}
        className="flex items-center gap-2"
      >
        <input type="hidden" name="insumoId" value={insumo.id} />
        <Boton type="submit" variante="peligro" tamano="chico" disabled={borrando}>
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
