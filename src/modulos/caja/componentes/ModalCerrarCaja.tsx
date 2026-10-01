"use client";

import { useActionState } from "react";
import { Boton } from "@/componentes/Boton";
import { Campo } from "@/componentes/Campo";
import { Modal } from "@/componentes/Modal";
import { cerrarCaja, type EstadoFormulario } from "../consultas/acciones";

const INICIAL: EstadoFormulario = { error: null };

/**
 * Arqueo CIEGO: no muestra cuánto debería haber ni, al confirmar, si sobra o
 * falta. Quien cuenta sin saber el número cuenta lo que hay; quien lo sabe,
 * cuenta hasta llegar. La diferencia la ve el dueño en el historial.
 */
export function ModalCerrarCaja({ onCerrar }: { onCerrar: () => void }) {
  const [estado, accion, enviando] = useActionState(
    async (previo: EstadoFormulario, datos: FormData) => {
      const resultado = await cerrarCaja(previo, datos);
      if (!resultado.error) onCerrar();
      return resultado;
    },
    INICIAL,
  );

  return (
    <Modal abierto onCerrar={onCerrar} titulo="Cerrar caja" cerrarConClicAfuera={false}>
      <form action={accion} className="flex flex-col gap-3">
        <p className="text-sm text-texto-suave">
          Contá toda la plata del cajón. Lo que no quede de fondo se lo lleva Goro.
        </p>
        <Campo
          etiqueta="¿Cuánto contaste?"
          name="contado"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          required
        />
        <Campo
          etiqueta="¿Cuánto queda de fondo para el próximo turno?"
          name="fondoQueQueda"
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
            Volver
          </Boton>
          <Boton type="submit" variante="peligro" disabled={enviando}>
            {enviando ? "Cerrando…" : "Cerrar caja"}
          </Boton>
        </div>
      </form>
    </Modal>
  );
}
