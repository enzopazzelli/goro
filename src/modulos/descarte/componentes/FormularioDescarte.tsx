"use client";

import { useActionState, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Boton } from "@/componentes/Boton";
import { nuevaClave } from "@/lib/claveUnica";
import { seleccionarAlEnfocar } from "@/lib/seleccionarAlEnfocar";
import { descartarArticulo, type EstadoDescarte } from "../consultas/acciones";
import { LARGO_MAXIMO_DE_NOTA } from "../formulario";
import { ETIQUETA_MOTIVO, MOTIVOS_A_ELEGIR, type ArticuloDescartable } from "../tipos";
import { SelectorDeArticulo } from "./SelectorDeArticulo";

const INICIAL: EstadoDescarte = { error: null };
const ROTULO = "flex flex-col gap-1 font-mono text-xs tracking-wide text-texto-suave uppercase";
const CAMPO = "rounded-(--r) border border-linea bg-superficie px-3 py-2 text-sm normal-case";

/**
 * Se escanea (o se elige) lo que se tira, la cantidad y el motivo. Como en
 * Recibir por código, el Enter de la pistola pasa a la cantidad en vez de
 * mandar el formulario a medias; al terminar vuelve al código.
 */
export function FormularioDescarte({ articulos }: { articulos: ArticuloDescartable[] }) {
  const formulario = useRef<HTMLFormElement>(null);
  const codigo = useRef<HTMLInputElement>(null);
  const cantidad = useRef<HTMLInputElement>(null);
  // Identifica este descarte ante la base: si se manda dos veces sin cambiar
  // nada (doble clic, respuesta perdida), la base devuelve el mismo y el stock
  // baja una sola vez. Cambia con cualquier cambio del formulario. Se genera en
  // un evento y no al renderizar: el servidor y el navegador no coincidirían.
  const [clave, setClave] = useState("");

  async function descartar(previo: EstadoDescarte, datos: FormData): Promise<EstadoDescarte> {
    const resultado = await descartarArticulo(previo, datos);
    if (!resultado.error) setClave("");
    return resultado;
  }
  const [estado, accion, enviando] = useActionState(descartar, INICIAL);

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
    <form
      ref={formulario}
      action={accion}
      onChange={() => setClave(nuevaClave())}
      className="flex flex-wrap items-end gap-3"
    >
      <input type="hidden" name="clave" value={clave} />
      <label className={ROTULO}>
        Código
        <input
          ref={codigo}
          name="codigo"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          onKeyDown={alApretarEnter}
          placeholder="Escaneá o tipeá"
          className={`numero w-44 ${CAMPO}`}
        />
      </label>
      <label className={ROTULO}>
        O elegí qué
        <SelectorDeArticulo articulos={articulos} className={`w-64 ${CAMPO}`} />
      </label>
      <label className={ROTULO}>
        Cantidad
        <input
          ref={cantidad}
          name="cantidad"
          type="number"
          min="0"
          step="any"
          required
          onFocus={seleccionarAlEnfocar}
          className={`numero w-28 ${CAMPO}`}
        />
      </label>
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
        <input name="nota" maxLength={LARGO_MAXIMO_DE_NOTA} className={`w-56 ${CAMPO}`} />
      </label>
      <Boton type="submit" variante="peligro" disabled={enviando}>
        {enviando ? "Descartando…" : "Descartar"}
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
