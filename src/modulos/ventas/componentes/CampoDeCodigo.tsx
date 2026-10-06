"use client";

import { useMemo, useRef, useState, useTransition, type FormEvent } from "react";
import { ListaDeSugerencias, useSugerencias } from "@/componentes/Sugerencias";
import type { Presentacion } from "@/lib/presentaciones";
import { formatearPlata } from "@/lib/plata";
import { buscarPorCodigo } from "../consultas/porCodigo";
import { itemDePresentacion } from "../itemDePresentacion";
import type { ItemEnCarrito } from "../tipos";

/**
 * Donde suena la pistola. Una pistola de código de barras es un teclado que
 * tipea el código y aprieta Enter, así que este mismo campo sirve para
 * tipearlo a mano: lo que se prueba hoy sin pistola es lo mismo que va a
 * pasar cuando llegue. Si lo que se escribe no es un código, ofrece los
 * productos con ese nombre: formatos, sabores y baldes ya tienen sus tarjetas,
 * y un pote es uno puntual, que se cobra escaneando su etiqueta.
 *
 * Queda con el foco después de cada lectura, para escanear uno atrás de otro
 * sin tocar el mouse. El resultado se avisa siempre (agregó, ya estaba, no lo
 * conozco): un código que no hace nada y no dice nada se lee como una pistola rota.
 */
export function CampoDeCodigo({
  presentaciones,
  yaEnElTicket,
  onAgregar,
}: {
  presentaciones: Presentacion[];
  yaEnElTicket: (item: ItemEnCarrito) => boolean;
  onAgregar: (item: ItemEnCarrito) => void;
}) {
  const [texto, setTexto] = useState("");
  const [aviso, setAviso] = useState<{ tono: "ok" | "alerta"; texto: string } | null>(null);
  const [buscando, empezar] = useTransition();
  const campo = useRef<HTMLInputElement>(null);

  const productos = useMemo(
    () =>
      presentaciones.map((presentacion) => {
        const item = itemDePresentacion(presentacion);
        return {
          clave: String(presentacion.id),
          nombre: item.nombre,
          detalle: formatearPlata(item.precio),
          item,
        };
      }),
    [presentaciones],
  );

  function agregar(item: ItemEnCarrito) {
    if (yaEnElTicket(item)) {
      setAviso({ tono: "alerta", texto: `${item.nombre} ya está en el ticket.` });
    } else {
      onAgregar(item);
      setAviso({ tono: "ok", texto: `Agregado: ${item.nombre}` });
    }
  }

  const buscador = useSugerencias(productos, (producto) => {
    setTexto("");
    agregar(producto.item);
  });

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    const codigo = texto.trim();
    if (!codigo) return;
    setTexto("");

    empezar(async () => {
      const resultado = await buscarPorCodigo(codigo);
      if ("error" in resultado) setAviso({ tono: "alerta", texto: resultado.error });
      else agregar(resultado.item);
      campo.current?.focus();
    });
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-1">
      <label
        htmlFor="codigo-de-barras"
        className="font-mono text-sm tracking-wide text-texto-suave uppercase"
      >
        Código o nombre
      </label>
      <div className="relative">
        <input
          ref={campo}
          id="codigo-de-barras"
          value={texto}
          onChange={(evento) => {
            setTexto(evento.target.value);
            buscador.alEscribir(evento.target.value);
          }}
          onKeyDown={buscador.alTeclear}
          onBlur={buscador.cerrar}
          placeholder="Escaneá un código o escribí el nombre de un producto"
          autoComplete="off"
          spellCheck={false}
          disabled={buscando}
          className="numero w-full rounded-(--r) border border-linea bg-superficie px-3 py-2.5 text-base"
        />
        <ListaDeSugerencias {...buscador} />
      </div>
      <p
        aria-live="polite"
        className={`min-h-5 text-sm ${aviso?.tono === "alerta" ? "text-alerta" : "text-ok"}`}
      >
        {aviso?.texto}
      </p>
    </form>
  );
}
