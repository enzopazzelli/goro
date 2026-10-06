"use client";

import { useCallback, useMemo, useState, type KeyboardEvent } from "react";
import { coincidencias, pareceCodigo, type OpcionDeBusqueda } from "@/lib/buscarPorNombre";

/**
 * Buscar por nombre en un campo que también recibe códigos. La pistola tipea un
 * código y aprieta Enter; con un código no hay sugerencias, así que ese Enter
 * sigue siendo del campo y nada cambia para quien escanea. Con un nombre, la
 * lista se queda con las flechas, Enter y Escape.
 */
export function useSugerencias<T extends OpcionDeBusqueda>(
  opciones: T[],
  onElegir: (opcion: T) => void,
) {
  const [texto, setTexto] = useState("");
  const [abierta, setAbierta] = useState(false);
  const [marcada, setMarcada] = useState(0);
  const [elegido, setElegido] = useState<T | null>(null);

  const sugerencias = useMemo(
    () => (abierta && !pareceCodigo(texto) ? coincidencias(opciones, texto) : []),
    [abierta, opciones, texto],
  );

  function alEscribir(valor: string) {
    setTexto(valor);
    setAbierta(true);
    setMarcada(0);
    setElegido(null);
  }

  function elegir(opcion: T) {
    setAbierta(false);
    setElegido(opcion);
    onElegir(opcion);
  }

  /** Si la tecla fue para la lista devuelve true, y el campo no tiene que hacer nada más con ella. */
  function alTeclear(evento: KeyboardEvent<HTMLInputElement>): boolean {
    if (sugerencias.length === 0) return false;
    const movimientos: Record<string, number> = { ArrowDown: 1, ArrowUp: -1 };

    if (evento.key in movimientos) {
      const ultima = sugerencias.length - 1;
      setMarcada((actual) => Math.min(Math.max(actual + movimientos[evento.key]!, 0), ultima));
    } else if (evento.key === "Escape") {
      setAbierta(false);
    } else if (evento.key === "Enter") {
      elegir(sugerencias[Math.min(marcada, sugerencias.length - 1)]!);
    } else {
      return false;
    }
    evento.preventDefault();
    return true;
  }

  /** Para cuando el formulario se vacía: sin lista abierta ni elegido de antes. */
  const limpiar = useCallback(() => {
    setTexto("");
    setAbierta(false);
    setElegido(null);
  }, []);

  return {
    sugerencias,
    marcada,
    elegido,
    alEscribir,
    alTeclear,
    elegir,
    limpiar,
    cerrar: () => setAbierta(false),
  };
}

/** Va debajo del campo, dentro de un contenedor `relative`. */
export function ListaDeSugerencias<T extends OpcionDeBusqueda>({
  sugerencias,
  marcada,
  elegir,
}: {
  sugerencias: T[];
  marcada: number;
  elegir: (opcion: T) => void;
}) {
  if (sugerencias.length === 0) return null;

  return (
    <ul
      role="listbox"
      className="absolute top-full right-0 left-0 z-10 mt-1 overflow-hidden rounded-(--r) border border-linea bg-superficie text-sm normal-case shadow-(--shadow-tarjeta)"
    >
      {sugerencias.map((opcion, indice) => (
        <li key={opcion.clave} role="option" aria-selected={indice === marcada}>
          <button
            type="button"
            // El foco se queda en el campo: si se fuera al botón, el campo se cerraría antes del clic.
            onMouseDown={(evento) => evento.preventDefault()}
            onClick={() => elegir(opcion)}
            className={`flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left tracking-normal ${
              indice === marcada ? "bg-acento-fondo" : "hover:bg-superficie-honda"
            }`}
          >
            <span className="font-semibold text-texto">{opcion.nombre}</span>
            {opcion.detalle && <span className="numero text-texto-suave">{opcion.detalle}</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}
