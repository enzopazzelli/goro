"use client";

import { useActionState, useEffect, useRef, type KeyboardEvent } from "react";
import { Boton } from "@/componentes/Boton";
import { seleccionarAlEnfocar } from "@/lib/seleccionarAlEnfocar";
import { recibirPorCodigo, type EstadoRecepcion } from "../consultas/accionesRecepcion";

const INICIAL: EstadoRecepcion = { error: null };
const ROTULO = "flex flex-col gap-1 font-mono text-xs tracking-wide text-texto-suave uppercase";
const CAMPO = "numero rounded-(--r) border border-linea bg-superficie px-3 py-2 text-sm";

/**
 * Recibir un pedido: escanear el código del insumo, tipear cuántos llegaron,
 * Enter. La pistola aprieta Enter al terminar de leer, y eso pasa el foco a la
 * cantidad en vez de mandar el formulario incompleto; el segundo Enter lo envía.
 * Al terminar vuelve al código, listo para el artículo siguiente.
 */
export function RecibirPorCodigo() {
  const [estado, accion, enviando] = useActionState(recibirPorCodigo, INICIAL);
  const formulario = useRef<HTMLFormElement>(null);
  const codigo = useRef<HTMLInputElement>(null);
  const cantidad = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (estado.aviso) {
      formulario.current?.reset();
      codigo.current?.focus();
    }
  }, [estado]);

  function alApretarEnter(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key !== "Enter" || evento.currentTarget.value.trim() === "") return;
    evento.preventDefault();
    cantidad.current?.focus();
  }

  return (
    <form ref={formulario} action={accion} className="flex flex-wrap items-end gap-3">
      <label className={ROTULO}>
        Código del artículo
        <input
          ref={codigo}
          name="codigo"
          required
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          onKeyDown={alApretarEnter}
          placeholder="Escaneá o tipeá"
          className={`w-52 ${CAMPO}`}
        />
      </label>
      <label className={ROTULO}>
        Cuántos llegaron
        <input
          ref={cantidad}
          name="cantidad"
          type="number"
          min="0"
          step="any"
          required
          onFocus={seleccionarAlEnfocar}
          className={`w-32 ${CAMPO}`}
        />
      </label>
      <Boton type="submit" disabled={enviando}>
        {enviando ? "Registrando…" : "Registrar entrada"}
      </Boton>
      <p role="status" className="min-h-5 w-full text-sm text-ok">
        {estado.aviso}
      </p>
      {estado.error && (
        <p role="alert" className="w-full text-sm text-alerta">
          {estado.error}
        </p>
      )}
    </form>
  );
}
