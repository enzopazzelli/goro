"use client";

import { useActionState, useState } from "react";
import { Boton } from "@/componentes/Boton";
import { Modal } from "@/componentes/Modal";
import { registrarMovimiento } from "../consultas/accionesInsumos";

const INICIAL = { error: null };

export function ModalCargarInsumo({
  abierto,
  onCerrar,
  insumoId,
  insumoNombre,
}: {
  abierto: boolean;
  onCerrar: () => void;
  insumoId: number;
  insumoNombre: string;
}) {
  const [estado, accion, enviando] = useActionState(registrarMovimiento, INICIAL);

  const [estadoPrevio, setEstadoPrevio] = useState(estado);
  if (estado !== estadoPrevio) {
    setEstadoPrevio(estado);
    if (!estado.error) onCerrar();
  }

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={`Cargar ${insumoNombre}`}>
      <form action={accion} className="flex flex-col gap-3">
        <input type="hidden" name="insumoId" value={insumoId} />
        <label className="flex flex-col gap-1">
          <span className="font-mono text-xs font-semibold tracking-wide text-texto-suave uppercase">
            Tipo
          </span>
          <select
            name="tipo"
            defaultValue="entrada"
            className="rounded-(--r) border border-linea bg-superficie px-3 py-2"
          >
            <option value="entrada">Entrada</option>
            <option value="ajuste">Ajuste</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-xs font-semibold tracking-wide text-texto-suave uppercase">
            Cantidad
          </span>
          <input
            type="number"
            name="cantidad"
            step="0.1"
            required
            className="rounded-(--r) border border-linea bg-superficie px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-xs font-semibold tracking-wide text-texto-suave uppercase">
            Motivo (opcional)
          </span>
          <input
            type="text"
            name="motivo"
            className="rounded-(--r) border border-linea bg-superficie px-3 py-2"
          />
        </label>
        {estado.error && (
          <p role="alert" className="text-sm text-alerta">
            {estado.error}
          </p>
        )}
        <Boton type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : "Registrar"}
        </Boton>
      </form>
    </Modal>
  );
}
