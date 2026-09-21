"use client";

import { Boton } from "@/componentes/Boton";
import { Punto } from "@/componentes/Punto";
import type { Sabor } from "@/lib/sabores";

export function SelectorDeSabores({
  formatoCantidadSabores,
  sabores,
  saborIds,
  kgDisponible,
  onAlternar,
  onCompletar,
}: {
  formatoCantidadSabores: number;
  sabores: Sabor[];
  saborIds: number[];
  kgDisponible: Record<number, number>;
  onAlternar: (saborId: number) => void;
  onCompletar: () => void;
}) {
  return (
    <div>
      <p className="mb-2 font-mono text-xs tracking-wide text-texto-suave uppercase">
        2 · Sabores — elegí hasta {formatoCantidadSabores}, llevás {saborIds.length}
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
                onClick={() => onAlternar(sabor.id)}
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

      {saborIds.length > 0 && saborIds.length < formatoCantidadSabores && (
        <Boton type="button" className="mt-2" onClick={onCompletar}>
          Agregar con estos sabores
        </Boton>
      )}
    </div>
  );
}
