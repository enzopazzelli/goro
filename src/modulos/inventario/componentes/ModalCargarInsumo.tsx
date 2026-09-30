"use client";

import { useActionState } from "react";
import { Boton } from "@/componentes/Boton";
import { Modal } from "@/componentes/Modal";
import type { EstadoFormulario } from "../consultas/acciones";
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
  // Se cierra al terminar la acción, no comparando estados durante el render: eso
  // le cambia el estado al padre mientras React renderiza (error de React), y además
  // la acción devuelve siempre el mismo objeto de éxito, así que la segunda carga
  // nunca se vería como un cambio.
  const [estado, accion, enviando] = useActionState(
    async (previo: EstadoFormulario, datos: FormData) => {
      const resultado = await registrarMovimiento(previo, datos);
      if (!resultado.error) onCerrar();
      return resultado;
    },
    INICIAL,
  );

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
