"use client";

import { useState } from "react";
import { Boton } from "@/componentes/Boton";
import { Cubeta } from "@/componentes/Cubeta";
import { Insignia } from "@/componentes/Insignia";
import type { Balde } from "@/lib/baldes";
import type { Sabor } from "@/lib/sabores";
import type { InsigniaSabor } from "../tipos";
import { BotonActivoSabor } from "./BotonActivoSabor";
import { BotonBorrarSabor } from "./BotonBorrarSabor";
import { DetalleBaldes } from "./DetalleBaldes";
import { EditorColorSabor } from "./EditorColorSabor";
import { EditorNombreSabor } from "./EditorNombreSabor";
import { FormularioMinimo } from "./FormularioMinimo";
import { ModalReponerBalde } from "./ModalReponerBalde";

export function FilaSaborExpandible({
  sabor,
  baldes,
  pct,
  insignia,
  baldeAbiertoId,
  esDuenio,
}: {
  sabor: Sabor;
  baldes: Balde[];
  pct: number;
  insignia: InsigniaSabor;
  baldeAbiertoId: number | null;
  esDuenio: boolean;
}) {
  const [expandida, setExpandida] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const baldeAbierto = baldes.find((balde) => balde.id === baldeAbiertoId) ?? null;

  return (
    <>
      <tr className="border-b border-linea last:border-0">
        <td className="px-2 py-[var(--fila-y)]">
          <Cubeta pct={pct} color={sabor.color} bajo={insignia.variante !== "ok"} />
        </td>
        <td className="px-2 py-[var(--fila-y)] font-semibold">{sabor.nombre}</td>
        <td className="numero px-2 py-[var(--fila-y)]">
          {baldeAbierto ? `${baldeAbierto.kgRestante} kg` : "—"}
        </td>
        <td className="numero px-2 py-[var(--fila-y)]">{sabor.stockMinimo ?? "default"}</td>
        <td className="px-2 py-[var(--fila-y)]">
          <Insignia variante={insignia.variante}>{insignia.texto}</Insignia>
        </td>
        <td className="px-2 py-[var(--fila-y)]">
          <Boton
            type="button"
            variante="suave"
            onClick={() => setModalAbierto(true)}
            className="px-3 py-1.5 text-xs"
          >
            Reponer
          </Boton>
        </td>
        <td className="px-2 py-[var(--fila-y)]">
          <button
            type="button"
            onClick={() => setExpandida((actual) => !actual)}
            aria-expanded={expandida}
            className="text-xs text-texto-suave"
          >
            {expandida ? "▲" : "▼"}
          </button>
        </td>
      </tr>

      {expandida && (
        <tr className="border-b border-linea bg-superficie-honda last:border-0">
          <td colSpan={7} className="p-2">
            <div className="flex flex-col gap-2">
              {esDuenio && (
                <div className="flex flex-wrap items-center gap-2">
                  <EditorColorSabor saborId={sabor.id} colorActual={sabor.color} />
                  <EditorNombreSabor saborId={sabor.id} nombreActual={sabor.nombre} />
                  <FormularioMinimo saborId={sabor.id} valorActual={sabor.stockMinimo} />
                  <BotonActivoSabor saborId={sabor.id} activo={sabor.activo} />
                  <BotonBorrarSabor saborId={sabor.id} nombre={sabor.nombre} />
                </div>
              )}
              <DetalleBaldes baldes={baldes} esDuenio={esDuenio} />
            </div>
          </td>
        </tr>
      )}

      <ModalReponerBalde
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        baldeId={baldeAbiertoId}
        saborNombre={sabor.nombre}
        kgRestante={baldeAbierto?.kgRestante ?? 0}
      />
    </>
  );
}
