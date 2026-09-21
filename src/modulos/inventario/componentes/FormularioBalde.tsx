"use client";

import { Boton } from "@/componentes/Boton";
import { Campo } from "@/componentes/Campo";
import { useAccionConReset } from "@/lib/useAccionConReset";
import type { Sabor } from "@/lib/sabores";
import { darDeAltaBalde } from "../consultas/acciones";

const INICIAL = { error: null };

export function FormularioBalde({ sabores }: { sabores: Sabor[] }) {
  const { estado, accion, enviando, formRef } = useAccionConReset(darDeAltaBalde, INICIAL);

  return (
    <form ref={formRef} action={accion} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold tracking-wide text-texto-suave uppercase">
          Sabor
        </span>
        <select
          name="saborId"
          required
          className="rounded-(--r) border border-linea bg-superficie px-3 py-2 text-sm"
        >
          {sabores.map((sabor) => (
            <option key={sabor.id} value={sabor.id}>
              {sabor.nombre}
            </option>
          ))}
        </select>
      </label>
      <Campo
        id="kg-inicial"
        name="kgInicial"
        etiqueta="Kg"
        type="number"
        step="0.1"
        min="0.1"
        required
      />
      <Campo id="costo-balde" name="costo" etiqueta="Costo" type="number" min="0" required />
      <Campo
        id="costo-envase"
        name="costoEnvase"
        etiqueta="Costo envase"
        type="number"
        min="0"
        required
      />
      <Boton type="submit" disabled={enviando}>
        {enviando ? "Guardando…" : "Dar de alta"}
      </Boton>
      {estado.error && (
        <p role="alert" className="text-sm text-alerta">
          {estado.error}
        </p>
      )}
    </form>
  );
}
