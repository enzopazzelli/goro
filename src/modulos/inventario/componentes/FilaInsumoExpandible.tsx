"use client";

import { useState } from "react";
import { Insignia } from "@/componentes/Insignia";
import type { Insumo } from "../tipos";
import { FormularioEdicionInsumo } from "./FormularioEdicionInsumo";
import { ModalCargarInsumo } from "./ModalCargarInsumo";

const ETIQUETA_UNIDAD: Record<string, string> = { u: "u", kg: "kg" };

export function FilaInsumoExpandible({ insumo, esDuenio }: { insumo: Insumo; esDuenio: boolean }) {
  const [expandida, setExpandida] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const bajoMinimo = insumo.cantidad <= insumo.minimo;

  return (
    <>
      <tr className="border-b border-linea last:border-0">
        <td className="px-2 py-[var(--fila-y)] font-semibold">{insumo.nombre}</td>
        <td className="numero px-2 py-[var(--fila-y)] text-texto-suave">{insumo.codigo}</td>
        <td className="numero px-2 py-[var(--fila-y)]">
          {insumo.cantidad} {ETIQUETA_UNIDAD[insumo.unidad]}
        </td>
        <td className="px-2 py-[var(--fila-y)]">
          <Insignia variante={bajoMinimo ? "advertencia" : "ok"}>
            {bajoMinimo ? "Reponer" : "Ok"}
          </Insignia>
        </td>
        <td className="px-2 py-[var(--fila-y)]">
          <button
            type="button"
            onClick={() => setModalAbierto(true)}
            className="text-xs underline opacity-70"
          >
            Cargar
          </button>
        </td>
        <td className="px-2 py-[var(--fila-y)]">
          {esDuenio && (
            <button
              type="button"
              onClick={() => setExpandida((actual) => !actual)}
              aria-expanded={expandida}
              className="text-xs text-texto-suave"
            >
              {expandida ? "▲" : "▼"}
            </button>
          )}
        </td>
      </tr>

      {expandida && esDuenio && (
        <tr className="border-b border-linea bg-superficie-honda last:border-0">
          <td colSpan={6} className="p-2">
            <FormularioEdicionInsumo insumo={insumo} />
          </td>
        </tr>
      )}

      <ModalCargarInsumo
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        insumoId={insumo.id}
        insumoNombre={insumo.nombre}
      />
    </>
  );
}
