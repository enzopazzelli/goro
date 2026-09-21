"use client";

import { useAccionConReset } from "@/lib/useAccionConReset";
import { registrarMovimiento } from "../consultas/accionesInsumos";

const INICIAL = { error: null };

export function FormularioMovimiento({ insumoId }: { insumoId: number }) {
  const { estado, accion, enviando, formRef } = useAccionConReset(registrarMovimiento, INICIAL);

  return (
    <form ref={formRef} action={accion} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="insumoId" value={insumoId} />
      <select
        name="tipo"
        required
        defaultValue="entrada"
        className="rounded-(--r) border border-linea bg-superficie px-2 py-1 text-xs"
      >
        <option value="entrada">Entrada</option>
        <option value="ajuste">Ajuste</option>
      </select>
      <input
        type="number"
        name="cantidad"
        step="0.1"
        required
        aria-label="Cantidad"
        placeholder="cantidad"
        className="numero w-20 rounded-(--r) border border-linea bg-superficie px-2 py-1 text-xs"
      />
      <input
        type="text"
        name="motivo"
        placeholder="motivo (opcional)"
        aria-label="Motivo"
        className="rounded-(--r) border border-linea bg-superficie px-2 py-1 text-xs"
      />
      <button type="submit" disabled={enviando} className="text-xs underline opacity-70">
        {enviando ? "Guardando…" : "Registrar"}
      </button>
      {estado.error && (
        <span role="alert" className="text-xs text-alerta">
          {estado.error}
        </span>
      )}
    </form>
  );
}
