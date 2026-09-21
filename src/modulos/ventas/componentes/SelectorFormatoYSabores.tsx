"use client";

import { useState } from "react";
import { Boton } from "@/componentes/Boton";
import type { Formato } from "@/lib/formatos";
import type { Sabor } from "@/lib/sabores";
import type { ItemEnCarrito } from "../tipos";

export function SelectorFormatoYSabores({
  formatos,
  sabores,
  onAgregar,
}: {
  formatos: Formato[];
  sabores: Sabor[];
  onAgregar: (item: ItemEnCarrito) => void;
}) {
  const [formatoId, setFormatoId] = useState<number | "">("");
  const [saborIds, setSaborIds] = useState<number[]>([]);

  const formato = formatos.find((f) => f.id === formatoId) ?? null;

  function alternarSabor(saborId: number) {
    setSaborIds((actuales) => {
      if (actuales.includes(saborId)) return actuales.filter((id) => id !== saborId);
      if (formato && actuales.length >= formato.cantidadSabores) return actuales;
      return [...actuales, saborId];
    });
  }

  function agregar() {
    if (!formato || saborIds.length === 0) return;
    const saboresNombres = saborIds.map(
      (id) => sabores.find((sabor) => sabor.id === id)?.nombre ?? "",
    );
    onAgregar({
      formatoId: formato.id,
      saborIds,
      formatoNombre: formato.nombre,
      precio: formato.precio,
      saboresNombres,
    });
    setFormatoId("");
    setSaborIds([]);
  }

  return (
    <div className="flex flex-col gap-2 rounded-(--r) border border-linea p-3">
      <select
        value={formatoId}
        onChange={(evento) => {
          setFormatoId(evento.target.value === "" ? "" : Number(evento.target.value));
          setSaborIds([]);
        }}
        className="rounded-(--r) border border-linea bg-superficie px-3 py-2 text-sm"
      >
        <option value="">Elegir formato</option>
        {formatos.map((f) => (
          <option key={f.id} value={f.id}>
            {f.nombre} — ${f.precio}
          </option>
        ))}
      </select>

      {formato && (
        <>
          <div className="flex flex-wrap gap-2">
            {sabores
              .filter((sabor) => sabor.activo)
              .map((sabor) => (
                <label key={sabor.id} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={saborIds.includes(sabor.id)}
                    onChange={() => alternarSabor(sabor.id)}
                  />
                  {sabor.nombre}
                </label>
              ))}
          </div>
          <p className="text-xs text-texto-suave">
            Hasta {formato.cantidadSabores} sabores — elegidos: {saborIds.length}
          </p>
        </>
      )}

      <Boton type="button" onClick={agregar} disabled={!formato || saborIds.length === 0}>
        Agregar al ticket
      </Boton>
    </div>
  );
}
