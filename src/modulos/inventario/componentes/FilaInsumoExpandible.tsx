"use client";

import { useState } from "react";
import { Insignia } from "@/componentes/Insignia";
import type { Presentacion } from "@/lib/presentaciones";
import { PresentacionesInsumo } from "@/modulos/presentaciones/componentes/PresentacionesInsumo";
import { estadoDeInsumo, type EstadoInsumo } from "../alerta";
import type { Insumo } from "../tipos";
import { FormularioEdicionInsumo } from "./FormularioEdicionInsumo";
import { ModalCargarInsumo } from "./ModalCargarInsumo";

const ETIQUETA_UNIDAD: Record<string, string> = { u: "u", kg: "kg" };

const INSIGNIA_INSUMO: Record<
  EstadoInsumo,
  { variante: "alerta" | "advertencia" | "ok"; texto: string }
> = {
  negativo: { variante: "alerta", texto: "Negativo: recontar" },
  bajo: { variante: "advertencia", texto: "Reponer" },
  ok: { variante: "ok", texto: "Ok" },
};

export function FilaInsumoExpandible({
  insumo,
  presentaciones,
  esDuenio,
}: {
  insumo: Insumo;
  presentaciones: Presentacion[];
  esDuenio: boolean;
}) {
  const [expandida, setExpandida] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const insignia = INSIGNIA_INSUMO[estadoDeInsumo(insumo.cantidad, insumo.minimo)];

  return (
    <>
      <tr className="border-b border-linea last:border-0">
        <td className="px-2 py-[var(--fila-y)] font-semibold">{insumo.nombre}</td>
        <td className="numero px-2 py-[var(--fila-y)] text-texto-suave">{insumo.codigo}</td>
        <td className="numero px-2 py-[var(--fila-y)]">
          {insumo.cantidad} {ETIQUETA_UNIDAD[insumo.unidad]}
        </td>
        <td className="px-2 py-[var(--fila-y)]">
          <Insignia variante={insignia.variante}>{insignia.texto}</Insignia>
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
            <div className="flex flex-col gap-3">
              <FormularioEdicionInsumo insumo={insumo} />
              <PresentacionesInsumo insumoId={insumo.id} presentaciones={presentaciones} />
            </div>
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
