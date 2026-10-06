"use client";

import { useEffect, useId, useRef, type KeyboardEvent, type RefObject } from "react";
import type { OpcionDeBusqueda } from "@/lib/buscarPorNombre";
import { ListaDeSugerencias, useSugerencias } from "./Sugerencias";

type Opcion = OpcionDeBusqueda & { codigo: string };

/**
 * El campo "código o nombre" de los formularios que después piden una cantidad
 * (recibir mercadería, descartar). Con la pistola, su Enter pasa a la cantidad
 * en vez de mandar el formulario a medias. Con un nombre, elegir de la lista
 * deja el código en el campo y también pasa a la cantidad: lo que viaja al
 * servidor es siempre un código, como si se hubiera escaneado.
 *
 * Cuando el formulario se vacía después de un registro, el foco vuelve acá,
 * listo para el artículo siguiente.
 */
export function CampoCodigoONombre({
  opciones,
  siguiente,
  claseRotulo,
  claseCampo,
}: {
  opciones: Opcion[];
  /** A dónde va el foco después: la cantidad. */
  siguiente: RefObject<HTMLInputElement | null>;
  claseRotulo: string;
  claseCampo: string;
}) {
  const id = useId();
  const campo = useRef<HTMLInputElement>(null);
  const buscador = useSugerencias(opciones, (opcion) => {
    if (campo.current) campo.current.value = opcion.codigo;
    siguiente.current?.focus();
  });
  const { limpiar } = buscador;

  useEffect(() => {
    const entrada = campo.current;
    const formulario = entrada?.form;
    function alVaciarse() {
      limpiar();
      entrada?.focus();
    }
    formulario?.addEventListener("reset", alVaciarse);
    return () => formulario?.removeEventListener("reset", alVaciarse);
  }, [limpiar]);

  function alTeclear(evento: KeyboardEvent<HTMLInputElement>) {
    if (buscador.alTeclear(evento)) return;
    if (evento.key !== "Enter" || evento.currentTarget.value.trim() === "") return;
    evento.preventDefault();
    siguiente.current?.focus();
  }

  const elegido = buscador.elegido;

  return (
    <div className={claseRotulo}>
      <label htmlFor={id}>Código o nombre</label>
      <div className="relative">
        <input
          ref={campo}
          id={id}
          name="codigo"
          required
          autoComplete="off"
          spellCheck={false}
          onChange={(evento) => buscador.alEscribir(evento.target.value)}
          onKeyDown={alTeclear}
          onBlur={buscador.cerrar}
          placeholder="Escaneá o escribí el nombre"
          className={claseCampo}
        />
        <ListaDeSugerencias {...buscador} />
      </div>
      {/* Al elegir por nombre el campo muestra el código: acá se lee qué se eligió. */}
      <span className="min-h-4 tracking-normal text-texto normal-case">
        {elegido && [elegido.nombre, elegido.detalle].filter(Boolean).join(" · ")}
      </span>
    </div>
  );
}
