"use client";

import { useActionState } from "react";
import { Boton } from "@/componentes/Boton";
import { Modal } from "@/componentes/Modal";
import { LARGO_MAXIMO_DE_NOTA } from "@/modulos/descarte/formulario";
import { ETIQUETA_MOTIVO, MOTIVOS_A_ELEGIR } from "@/modulos/descarte/tipos";
import { descartarPote, type EstadoPote } from "../consultas/acciones";
import type { PoteEnFreezer } from "../tipos";

const INICIAL: EstadoPote = { error: null };
const ROTULO =
  "flex flex-col gap-1 font-mono text-xs font-semibold tracking-wide text-texto-suave uppercase";
const CAMPO = "rounded-(--r) border border-linea bg-superficie px-3 py-2 text-sm normal-case";

/** Se tira un pote del freezer, con su motivo: es lo que después dice por qué se pierde plata. */
export function ModalDescartarPote({
  abierto,
  onCerrar,
  pote,
}: {
  abierto: boolean;
  onCerrar: () => void;
  pote: PoteEnFreezer;
}) {
  const [estado, accion, enviando] = useActionState(async (previo: EstadoPote, datos: FormData) => {
    const resultado = await descartarPote(previo, datos);
    if (!resultado.error) onCerrar();
    return resultado;
  }, INICIAL);

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={`Descartar el pote ${pote.codigo}`}>
      <form action={accion} className="flex flex-col gap-3">
        <p className="text-sm text-texto-suave">
          {pote.formatoNombre} de {pote.saborNombre}, {pote.pesoG} g. Se tira: el helado no vuelve
          al balde.
        </p>
        <label className={ROTULO}>
          Por qué
          <select name="motivo" defaultValue="vencido" className={CAMPO}>
            {MOTIVOS_A_ELEGIR.map((motivo) => (
              <option key={motivo} value={motivo}>
                {ETIQUETA_MOTIVO[motivo]}
              </option>
            ))}
          </select>
        </label>
        <label className={ROTULO}>
          Nota (opcional)
          <input name="nota" maxLength={LARGO_MAXIMO_DE_NOTA} className={CAMPO} />
        </label>
        <input type="hidden" name="poteId" value={pote.id} />
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
            {enviando ? "Descartando…" : "Descartar"}
          </Boton>
        </div>
      </form>
    </Modal>
  );
}
