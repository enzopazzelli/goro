"use client";

import { useActionState } from "react";
import { Boton } from "@/componentes/Boton";
import { CampoChico } from "@/componentes/CampoChico";
import { etiquetaPresentacion } from "@/lib/etiquetaPresentacion";
import type { Presentacion } from "@/lib/presentaciones";
import { editarPresentacion, eliminarPresentacion } from "../consultas/acciones";

const INICIAL = { error: null };

export function FilaPresentacion({ presentacion }: { presentacion: Presentacion }) {
  const [estado, accion, guardando] = useActionState(editarPresentacion, INICIAL);
  const [estadoBorrado, accionBorrar, borrando] = useActionState(eliminarPresentacion, INICIAL);
  const idFormularioBorrar = `borrar-presentacion-${presentacion.id}`;

  return (
    <>
      <form action={accion} className="flex flex-wrap items-end gap-x-6 gap-y-3">
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
        <Boton type="submit" variante="suave" tamano="chico" disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar"}
        </Boton>
        {/* Un formulario no puede ir dentro de otro: este botón envía el de abajo (atributo `form`). */}
        <Boton
          type="submit"
          variante="peligro"
          tamano="chico"
          form={idFormularioBorrar}
          disabled={borrando}
          onClick={(evento) => {
            if (!confirm(`¿Borrar "${presentacion.nombre}"?`)) evento.preventDefault();
          }}
        >
          {borrando ? "Borrando…" : "Borrar"}
        </Boton>
        {(estado.error || estadoBorrado.error) && (
          <span role="alert" className="pb-1 text-xs text-alerta">
            {estado.error ?? estadoBorrado.error}
          </span>
        )}
      </form>
      <form id={idFormularioBorrar} action={accionBorrar} className="hidden">
        <input type="hidden" name="presentacionId" value={presentacion.id} />
      </form>
    </>
  );
}
