"use client";

import { Boton } from "@/componentes/Boton";
import { Campo } from "@/componentes/Campo";
import { useAccionConReset } from "@/lib/useAccionConReset";
import { crearInsumo } from "../consultas/accionesInsumos";

const INICIAL = { error: null };

export function FormularioInsumo() {
  const { estado, accion, enviando, formRef } = useAccionConReset(crearInsumo, INICIAL);

  return (
    <form ref={formRef} action={accion} className="flex flex-wrap items-end gap-2">
      <Campo id="nombre-insumo" name="nombre" etiqueta="Insumo nuevo" required />
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold tracking-wide text-texto-suave uppercase">
          Unidad
        </span>
        <select
          name="unidad"
          required
          defaultValue=""
          className="rounded-(--r) border border-linea bg-superficie px-3 py-2 text-sm"
        >
          <option value="" disabled>
            Elegir
          </option>
          <option value="u">Unidad</option>
          <option value="kg">Kilo</option>
        </select>
      </label>
      <Campo id="minimo-insumo" name="minimo" etiqueta="Mínimo" type="number" min="0" required />
      <Campo id="costo-insumo" name="costo" etiqueta="Costo" type="number" min="0" required />
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
