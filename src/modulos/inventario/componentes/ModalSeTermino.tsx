"use client";

import { useActionState, type FormEvent } from "react";
import { Boton } from "@/componentes/Boton";
import { Modal } from "@/componentes/Modal";
import { formatearKilos } from "@/lib/kilos";
import { seleccionarAlEnfocar } from "@/lib/seleccionarAlEnfocar";
import type { EstadoFormulario } from "../consultas/acciones";
import { vaciarBalde } from "../consultas/accionesCicloBalde";

const INICIAL: EstadoFormulario = { error: null };

/** Cuánto más de lo estimado se acepta sin preguntar: un 4 tipeado donde iba 0,4 no pasa callado. */
const MARGEN_SIN_PREGUNTAR_KG = 0.5;

/**
 * "Se terminó" pregunta cuánto se tiró. El campo arranca VACÍO y no con lo que
 * el sistema estimaba: con la estimación adentro, un Enter la registraría como
 * descarte, que es justo la mezcla que este número viene a separar.
 */
export function ModalSeTermino({
  abierto,
  onCerrar,
  baldeId,
  codigo,
  saborNombre,
  kgRestante,
}: {
  abierto: boolean;
  onCerrar: () => void;
  baldeId: number;
  codigo: string;
  saborNombre: string;
  kgRestante: number;
}) {
  const [estado, accion, enviando] = useActionState(
    async (previo: EstadoFormulario, datos: FormData) => {
      const resultado = await vaciarBalde(previo, datos);
      if (!resultado.error) onCerrar();
      return resultado;
    },
    INICIAL,
  );

  function revisar(evento: FormEvent<HTMLFormElement>) {
    const tirado = Number(new FormData(evento.currentTarget).get("kgTirado"));
    if (tirado <= kgRestante + MARGEN_SIN_PREGUNTAR_KG) return;
    const pregunta = `El sistema calculaba ${formatearKilos(kgRestante)} y pusiste ${formatearKilos(tirado)}. ¿Se tiraron de verdad ${formatearKilos(tirado)}?`;
    if (!confirm(pregunta)) evento.preventDefault();
  }

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={`¿Se terminó ${codigo} (${saborNombre})?`}>
      <form action={accion} onSubmit={revisar} className="flex flex-col gap-3">
        <p className="text-sm text-texto-suave">
          El sistema calculaba que quedaban {formatearKilos(kgRestante)}.
        </p>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-xs font-semibold tracking-wide text-texto-suave uppercase">
            ¿Cuánto se tiró? (kg)
          </span>
          <input
            type="number"
            name="kgTirado"
            min="0"
            step="0.01"
            placeholder="0"
            onFocus={seleccionarAlEnfocar}
            className="numero rounded-(--r) border border-linea bg-superficie px-3 py-2"
          />
        </label>
        <p className="text-xs text-texto-suave">Vacío o 0 si no se tiró nada.</p>
        {/* Después del campo: el Modal enfoca el primer input, y uno oculto no recibe el foco. */}
        <input type="hidden" name="baldeId" value={baldeId} />
        {estado.error && (
          <p role="alert" className="text-sm text-alerta">
            {estado.error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Boton type="button" variante="suave" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" variante="peligro" disabled={enviando}>
            {enviando ? "Guardando…" : "Se terminó"}
          </Boton>
        </div>
      </form>
    </Modal>
  );
}
