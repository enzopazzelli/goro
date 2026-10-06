"use client";

import { useState } from "react";
import type { Balde } from "@/lib/baldes";
import type { Formato } from "@/lib/formatos";
import { kgPorSabor } from "@/lib/kgPorSabor";
import type { Sabor } from "@/lib/sabores";
import { formatearPlata } from "@/lib/plata";
import type { ItemEnCarrito } from "../tipos";
import { DETALLE, NOMBRE, PRECIO, ROTULO_DE_GRUPO, TARJETA, TARJETA_LIBRE } from "./estilosDeVenta";
import { SelectorDeSabores } from "./SelectorDeSabores";

export function SelectorFormatoYSabores({
  formatos,
  sabores,
  baldes,
  onAgregar,
}: {
  formatos: Formato[];
  sabores: Sabor[];
  baldes: Balde[];
  onAgregar: (item: ItemEnCarrito) => void;
}) {
  const [formatoId, setFormatoId] = useState<number | null>(null);
  const [saborIds, setSaborIds] = useState<number[]>([]);

  const formato = formatos.find((f) => f.id === formatoId) ?? null;
  const kgDisponible = kgPorSabor(baldes);

  function completar(idsFinal: number[]) {
    if (!formato || idsFinal.length === 0) return;
    const saboresNombres = idsFinal.map(
      (id) => sabores.find((sabor) => sabor.id === id)?.nombre ?? "",
    );
    onAgregar({
      tipo: "formato",
      formatoId: formato.id,
      saborIds: idsFinal,
      nombre: formato.nombre,
      precio: formato.precio,
      saboresNombres,
    });
    setFormatoId(null);
    setSaborIds([]);
  }

  function alternarSabor(saborId: number) {
    setSaborIds((actuales) => {
      const yaElegido = actuales.includes(saborId);
      const nuevos = yaElegido ? actuales.filter((id) => id !== saborId) : [...actuales, saborId];
      if (!yaElegido && formato && nuevos.length === formato.cantidadSabores) {
        completar(nuevos);
        return [];
      }
      return nuevos;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className={ROTULO_DE_GRUPO}>1 · Formato</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {formatos.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={formatoId === f.id}
              onClick={() => {
                setFormatoId(f.id);
                setSaborIds([]);
              }}
              className={`${TARJETA} ${
                formatoId === f.id ? "border-marco bg-marco text-fondo" : TARJETA_LIBRE
              }`}
            >
              <span className={NOMBRE}>{f.nombre}</span>
              <span className={DETALLE}>
                {f.gramos} g · {f.cantidadSabores} sabor{f.cantidadSabores > 1 ? "es" : ""}
              </span>
              <span className={PRECIO}>{formatearPlata(f.precio)}</span>
            </button>
          ))}
        </div>
      </div>

      {formato && (
        <SelectorDeSabores
          formatoCantidadSabores={formato.cantidadSabores}
          sabores={sabores}
          saborIds={saborIds}
          kgDisponible={kgDisponible}
          onAlternar={alternarSabor}
          onCompletar={() => completar(saborIds)}
        />
      )}
    </div>
  );
}
