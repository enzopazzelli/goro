"use client";

import { useActionState, useState } from "react";
import { Boton } from "@/componentes/Boton";
import { diaYHoraDe } from "@/lib/fechas";
import { formatearPlata } from "@/lib/plata";
import { anularPote, type EstadoPote } from "../consultas/acciones";
import type { PoteEnFreezer } from "../tipos";
import { ModalDescartarPote } from "./ModalDescartarPote";

const INICIAL: EstadoPote = { error: null };

/** Se armó por error: pide confirmación antes de devolver el helado al balde. */
function BotonAnular({ pote }: { pote: PoteEnFreezer }) {
  const [estado, ejecutar, enviando] = useActionState(anularPote, INICIAL);

  return (
    <form
      action={ejecutar}
      onSubmit={(evento) => {
        const pregunta = `¿Anular el pote ${pote.codigo}? Se armó por error: el helado vuelve al balde.`;
        if (!confirm(pregunta)) evento.preventDefault();
      }}
      className="flex items-center gap-2"
    >
      <input type="hidden" name="poteId" value={pote.id} />
      <Boton type="submit" variante="suave" tamano="chico" disabled={enviando}>
        Anular
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
  const [descartando, setDescartando] = useState(false);

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
          <BotonAnular pote={pote} />
          {/* Sin permiso de por medio: el que lo encuentra vencido es el que lo tira. */}
          <Boton
            type="button"
            variante="peligro"
            tamano="chico"
            onClick={() => setDescartando(true)}
          >
            Descartar
          </Boton>
          <ModalDescartarPote
            abierto={descartando}
            onCerrar={() => setDescartando(false)}
            pote={pote}
          />
        </div>
      </td>
    </tr>
  );
}
