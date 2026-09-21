"use client";

import { useActionState, useState } from "react";
import { Boton } from "@/componentes/Boton";
import { Modal } from "@/componentes/Modal";
import { registrarAjusteBalde } from "../consultas/acciones";

const INICIAL = { error: null };

export function ModalReponerBalde({
  abierto,
  onCerrar,
  baldeId,
  saborNombre,
  kgRestante,
}: {
  abierto: boolean;
  onCerrar: () => void;
  baldeId: number | null;
  saborNombre: string;
  kgRestante: number;
}) {
  const [estado, accion, enviando] = useActionState(registrarAjusteBalde, INICIAL);

  // Cierra solo al confirmar sin error, con el mismo patrón de "ajustar
  // estado durante el render" que ya se usa en el ticket de Ventas.
  const [estadoPrevio, setEstadoPrevio] = useState(estado);
  if (estado !== estadoPrevio) {
    setEstadoPrevio(estado);
    if (!estado.error) onCerrar();
  }

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={`Reponer ${saborNombre}`}>
      {baldeId === null ? (
        <p className="text-sm text-texto-suave">
          No hay un balde abierto de este sabor — abrí uno primero desde el detalle.
        </p>
      ) : (
        <form action={accion} className="flex flex-col gap-3">
          <input type="hidden" name="baldeId" value={baldeId} />
          <p className="text-sm text-texto-suave">Balde abierto: {kgRestante} kg ahora.</p>
          <label className="flex flex-col gap-1">
            <span className="font-mono text-xs font-semibold tracking-wide text-texto-suave uppercase">
              Kilos que entran (negativo para corregir para abajo)
            </span>
            <input
              type="number"
              name="kg"
              step="0.1"
              required
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
      )}
    </Modal>
  );
}
