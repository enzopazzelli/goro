"use client";

import { Boton } from "@/componentes/Boton";
import { Campo } from "@/componentes/Campo";
import { useAccionConReset } from "@/lib/useAccionConReset";
import { crearPresentacion } from "../consultas/acciones";

const INICIAL = { error: null };

export function FormularioPresentacion({ insumoId }: { insumoId: number }) {
  const { estado, accion, enviando, formRef } = useAccionConReset(crearPresentacion, INICIAL);

  return (
    <form ref={formRef} action={accion} className="flex flex-wrap items-end gap-x-6 gap-y-3">
      <input type="hidden" name="insumoId" value={insumoId} />
      <Campo
        id={`nombre-presentacion-${insumoId}`}
        name="nombre"
        etiqueta="Otra presentación"
        placeholder="Caja"
        required
      />
      <Campo
        id={`unidades-presentacion-${insumoId}`}
        name="unidades"
        etiqueta="Unidades (×)"
        type="number"
        min="1"
        required
      />
      <Campo
        id={`precio-presentacion-${insumoId}`}
        name="precio"
        etiqueta="Precio de venta"
        type="number"
        min="0"
      />
      <Boton type="submit" disabled={enviando}>
        {enviando ? "Creando…" : "Agregar"}
      </Boton>
      {estado.error && (
        <p role="alert" className="text-sm text-alerta">
          {estado.error}
        </p>
      )}
    </form>
  );
}
