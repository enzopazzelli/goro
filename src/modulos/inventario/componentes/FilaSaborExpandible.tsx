"use client";

import { useState } from "react";
import { Cubeta } from "@/componentes/Cubeta";
import { Insignia } from "@/componentes/Insignia";
import type { Balde } from "@/lib/baldes";
import type { Sabor } from "@/lib/sabores";
import { BotonActivoSabor } from "./BotonActivoSabor";
import { BotonBorrarSabor } from "./BotonBorrarSabor";
import { DetalleBaldes } from "./DetalleBaldes";
import { EditorColorSabor } from "./EditorColorSabor";
import { EditorNombreSabor } from "./EditorNombreSabor";
import { FormularioMinimo } from "./FormularioMinimo";
import { ModalReponerBalde } from "./ModalReponerBalde";

export type InsigniaSabor = { variante: "ok" | "advertencia" | "alerta"; texto: string };

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
    <div className="rounded-(--r) border border-linea">
      <div className="flex flex-wrap items-center gap-3 p-2">
        <Cubeta pct={pct} color={sabor.color} bajo={insignia.variante !== "ok"} />
        <span className="min-w-[8ch] flex-1 font-semibold">{sabor.nombre}</span>
        <span className="numero text-xs text-texto-suave">
          {sabor.stockMinimo ?? "default"} kg mín.
        </span>
        <Insignia variante={insignia.variante}>{insignia.texto}</Insignia>
        <button
          type="button"
          onClick={() => setModalAbierto(true)}
          className="text-xs underline opacity-70"
        >
          Reponer
        </button>
        <button
          type="button"
          onClick={() => setExpandida((actual) => !actual)}
          aria-expanded={expandida}
          className="text-xs text-texto-suave"
        >
          {expandida ? "▲" : "▼"}
        </button>
      </div>

      {expandida && (
        <div className="flex flex-col gap-2 border-t border-linea bg-superficie-honda p-2">
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
      )}

      <ModalReponerBalde
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        baldeId={baldeAbiertoId}
        saborNombre={sabor.nombre}
        kgRestante={baldeAbierto?.kgRestante ?? 0}
      />
    </div>
  );
}
