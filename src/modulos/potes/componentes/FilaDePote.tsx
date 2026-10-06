"use client";

import { useActionState } from "react";
import { Boton } from "@/componentes/Boton";
import { diaYHoraDe } from "@/lib/fechas";
import { formatearPlata } from "@/lib/plata";
import { SiPuede } from "@/modulos/auth/componentes/Permisos";
import { anularPote, descartarPote, type EstadoPote } from "../consultas/acciones";
import type { PoteEnFreezer } from "../tipos";

const INICIAL: EstadoPote = { error: null };

/** Un botón de la fila que pide confirmación antes de tocar el stock. */
function AccionDePote({
  poteId,
  accion,
  texto,
  pregunta,
  variante,
}: {
  poteId: number;
  accion: (previo: EstadoPote, datos: FormData) => Promise<EstadoPote>;
  texto: string;
  pregunta: string;
  variante: "suave" | "peligro";
}) {
  const [estado, ejecutar, enviando] = useActionState(accion, INICIAL);

  return (
    <form
      action={ejecutar}
      onSubmit={(evento) => {
        if (!confirm(pregunta)) evento.preventDefault();
      }}
      className="flex items-center gap-2"
    >
      <input type="hidden" name="poteId" value={poteId} />
      <Boton type="submit" variante={variante} tamano="chico" disabled={enviando}>
        {texto}
      </Boton>
      {estado.error && (
        <span role="alert" className="text-xs text-alerta">
          {estado.error}
        </span>
      )}
    </form>
  );
}

export function FilaDePote({
  pote,
  elegido,
  onAlternar,
}: {
  pote: PoteEnFreezer;
  elegido: boolean;
  onAlternar: () => void;
}) {
  return (
    <tr className="border-b border-linea align-top last:border-0">
      <td className="p-2">
        <input
          type="checkbox"
          checked={elegido}
          onChange={onAlternar}
          aria-label={`Imprimir la etiqueta de ${pote.codigo}`}
        />
      </td>
      <td className="numero p-2">{pote.codigo}</td>
      <td className="p-2">
        <span className="font-semibold">{pote.formatoNombre}</span> · {pote.saborNombre}
      </td>
      <td className="numero p-2 text-right">{pote.pesoG} g</td>
      <td className="numero p-2 text-right">{formatearPlata(pote.precio)}</td>
      <td className="p-2 text-xs text-texto-suave">{diaYHoraDe(pote.armadoEn)}</td>
      <td className="p-2">
        <div className="flex flex-wrap justify-end gap-3">
          <AccionDePote
            poteId={pote.id}
            accion={anularPote}
            texto="Anular"
            variante="suave"
            pregunta={`¿Anular el pote ${pote.codigo}? Se armó por error: el helado vuelve al balde.`}
          />
          <SiPuede permiso="cargar_inventario">
            <AccionDePote
              poteId={pote.id}
              accion={descartarPote}
              texto="Descartar"
              variante="peligro"
              pregunta={`¿Descartar el pote ${pote.codigo}? Se tira: el helado NO vuelve al balde.`}
            />
          </SiPuede>
        </div>
      </td>
    </tr>
  );
}
