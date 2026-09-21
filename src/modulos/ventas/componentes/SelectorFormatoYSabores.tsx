"use client";

import { useState } from "react";
import { Boton } from "@/componentes/Boton";
import { Punto } from "@/componentes/Punto";
import type { Balde } from "@/lib/baldes";
import type { Formato } from "@/lib/formatos";
import { kgPorSabor } from "@/lib/kgPorSabor";
import type { Sabor } from "@/lib/sabores";
import type { ItemEnCarrito } from "../tipos";

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
      formatoId: formato.id,
      saborIds: idsFinal,
      formatoNombre: formato.nombre,
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
        <p className="mb-2 font-mono text-xs tracking-wide text-texto-suave uppercase">
          1 · Formato
        </p>
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
              className={`flex flex-col items-center gap-1 rounded-(--radius-arco) border p-3 text-center transition ${
                formatoId === f.id
                  ? "border-marco bg-marco text-fondo"
                  : "border-linea bg-superficie hover:bg-superficie-honda"
              }`}
            >
              <span className="font-display font-semibold">{f.nombre}</span>
              <span className="font-mono text-xs opacity-70">
                {f.gramos} g · {f.cantidadSabores} sabor{f.cantidadSabores > 1 ? "es" : ""}
              </span>
              <span className="numero">${f.precio}</span>
            </button>
          ))}
        </div>
      </div>

      {formato && (
        <div>
          <p className="mb-2 font-mono text-xs tracking-wide text-texto-suave uppercase">
            2 · Sabores — elegí hasta {formato.cantidadSabores}, llevás {saborIds.length}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {sabores
              .filter((sabor) => sabor.activo)
              .map((sabor) => {
                const elegido = saborIds.includes(sabor.id);
                const agotado = (kgDisponible[sabor.id] ?? 0) <= 0;
                return (
                  <button
                    key={sabor.id}
                    type="button"
                    aria-pressed={elegido}
                    disabled={agotado}
                    onClick={() => alternarSabor(sabor.id)}
                    className={`flex items-center gap-2 rounded-(--radius-arco) border p-2 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      elegido
                        ? "border-acento bg-acento-fondo"
                        : "border-linea bg-superficie hover:bg-superficie-honda"
                    }`}
                  >
                    <Punto color={sabor.color} grande />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{sabor.nombre}</span>
                      <span className="font-mono text-xs text-texto-suave">
                        {agotado ? "agotado" : `${(kgDisponible[sabor.id] ?? 0).toFixed(1)} kg`}
                      </span>
                    </span>
                  </button>
                );
              })}
          </div>

          {saborIds.length > 0 && saborIds.length < formato.cantidadSabores && (
            <Boton type="button" className="mt-2" onClick={() => completar(saborIds)}>
              Agregar con estos sabores
            </Boton>
          )}
        </div>
      )}
    </div>
  );
}
