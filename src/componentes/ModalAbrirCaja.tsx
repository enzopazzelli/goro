"use client";

import { useActionState, useState } from "react";
import { abrirCaja, type EstadoFormulario } from "@/lib/accionesCaja";
import { Boton } from "./Boton";
import { Campo } from "./Campo";
import { Modal } from "./Modal";

const INICIAL: EstadoFormulario = { error: null };

/**
 * Apertura CIEGA: pregunta cuánto hay y no sugiere nada. Si mostrara "el cierre
 * anterior dejó $45.000", quien abre tocaría Confirmar sin contar, y la
 * comparación entre turnos (que ve el dueño) dejaría de controlar algo.
 */
export function ModalAbrirCaja({ onCerrar }: { onCerrar: () => void }) {
  // Se cierra al terminar la acción, nunca comparando estados durante el render
  // (ver ModalCargarInsumo).
  const [estado, accion, enviando] = useActionState(
    async (previo: EstadoFormulario, datos: FormData) => {
      const resultado = await abrirCaja(previo, datos);
      if (!resultado.error) onCerrar();
      return resultado;
    },
    INICIAL,
  );

  return (
    <Modal abierto onCerrar={onCerrar} titulo="Abrir caja" cerrarConClicAfuera={false}>
      <form action={accion} className="flex flex-col gap-3">
        <p className="text-sm text-texto-suave">
          Contá la plata del cajón antes de empezar a cobrar.
        </p>
        <Campo
          etiqueta="¿Cuánto hay en el cajón?"
          name="contado"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          required
        />
        {estado.error && (
          <p role="alert" className="text-sm text-alerta">
            {estado.error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Boton type="button" variante="fantasma" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" disabled={enviando}>
            {enviando ? "Abriendo…" : "Abrir caja"}
          </Boton>
        </div>
      </form>
    </Modal>
  );
}

export function BotonAbrirCaja({ variante = "principal" }: { variante?: "principal" | "suave" }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <Boton type="button" variante={variante} onClick={() => setAbierto(true)}>
        Abrir caja
      </Boton>
      {/* Se monta al abrir: arranca en limpio, sin el error de la vez anterior. */}
      {abierto && <ModalAbrirCaja onCerrar={() => setAbierto(false)} />}
    </>
  );
}
