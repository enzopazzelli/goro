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
    <div className="rounded-(--r) border border-linea">
      <div className="flex flex-wrap items-center gap-3 p-2">
        <span className="min-w-[8ch] flex-1 font-semibold">{insumo.nombre}</span>
        <span className="numero text-xs text-texto-suave">{insumo.codigo}</span>
        <span className="numero">
          {insumo.cantidad} {ETIQUETA_UNIDAD[insumo.unidad]}
        </span>
        <Insignia variante={bajoMinimo ? "advertencia" : "ok"}>
          {bajoMinimo ? "Reponer" : "Ok"}
        </Insignia>
        <button
          type="button"
          onClick={() => setModalAbierto(true)}
          className="text-xs underline opacity-70"
        >
          Cargar
        </button>
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
      </div>

      {expandida && esDuenio && (
        <div className="border-t border-linea bg-superficie-honda p-2">
          <FormularioEdicionInsumo insumo={insumo} />
        </div>
      )}

      <ModalCargarInsumo
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        insumoId={insumo.id}
        insumoNombre={insumo.nombre}
      />
    </div>
  );
}
