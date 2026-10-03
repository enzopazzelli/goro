"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { buscarPorCodigo } from "../consultas/porCodigo";
import type { ItemEnCarrito } from "../tipos";

/**
 * Donde suena la pistola. Una pistola de código de barras es un teclado que
 * tipea el código y aprieta Enter, así que este mismo campo sirve para
 * tipearlo a mano: lo que se prueba hoy sin pistola es lo mismo que va a
 * pasar cuando llegue.
 *
 * Queda con el foco después de cada lectura, para escanear uno atrás de otro
 * sin tocar el mouse. El resultado se avisa siempre (agregó, ya estaba, no lo
 * conozco): un código que no hace nada y no dice nada se lee como una pistola rota.
 */
export function CampoDeCodigo({
  yaEnElTicket,
  onAgregar,
}: {
  yaEnElTicket: (item: ItemEnCarrito) => boolean;
  onAgregar: (item: ItemEnCarrito) => void;
}) {
  const [texto, setTexto] = useState("");
  const [aviso, setAviso] = useState<{ tono: "ok" | "alerta"; texto: string } | null>(null);
  const [buscando, empezar] = useTransition();
  const campo = useRef<HTMLInputElement>(null);

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    const codigo = texto.trim();
    if (!codigo) return;
    setTexto("");

    empezar(async () => {
      const resultado = await buscarPorCodigo(codigo);

      if ("error" in resultado) {
        setAviso({ tono: "alerta", texto: resultado.error });
      } else if (yaEnElTicket(resultado.item)) {
        setAviso({ tono: "alerta", texto: `${resultado.item.nombre} ya está en el ticket.` });
      } else {
        onAgregar(resultado.item);
        setAviso({ tono: "ok", texto: `Agregado: ${resultado.item.nombre}` });
      }
      campo.current?.focus();
    });
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-1">
      <label
        htmlFor="codigo-de-barras"
        className="font-mono text-xs tracking-wide text-texto-suave uppercase"
      >
        Código de barras
      </label>
      <input
        ref={campo}
        id="codigo-de-barras"
        value={texto}
        onChange={(evento) => setTexto(evento.target.value)}
        placeholder="Escaneá o tipeá un código y apretá Enter"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        disabled={buscando}
        className="numero rounded-(--r) border border-linea bg-superficie px-3 py-2 text-sm"
      />
      <p
        aria-live="polite"
        className={`min-h-5 text-sm ${aviso?.tono === "alerta" ? "text-alerta" : "text-ok"}`}
      >
        {aviso?.texto}
      </p>
    </form>
  );
}
