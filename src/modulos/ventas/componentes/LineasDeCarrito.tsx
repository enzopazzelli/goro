"use client";

import { Punto } from "@/componentes/Punto";
import type { Sabor } from "@/lib/sabores";
import type { ItemEnCarrito } from "../tipos";

export function LineasDeCarrito({
  carrito,
  sabores,
  onQuitar,
}: {
  carrito: ItemEnCarrito[];
  sabores: Sabor[];
  onQuitar: (indice: number) => void;
}) {
  return (
    <ul className="flex max-h-[44vh] flex-col gap-2 overflow-y-auto">
      {carrito.map((item, indice) => (
        <li key={indice} className="flex items-start gap-2 border-b border-linea pb-2">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">
              {item.formatoNombre} · <span className="numero">${item.precio}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-texto-suave">
              {item.saborIds.map((saborId) => {
                const sabor = sabores.find((s) => s.id === saborId);
                return (
                  <span key={saborId} className="flex items-center gap-1">
                    <Punto color={sabor?.color ?? "var(--texto-suave)"} /> {sabor?.nombre ?? ""}
                  </span>
                );
              })}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onQuitar(indice)}
            aria-label={`Quitar ${item.formatoNombre}`}
            className="text-texto-suave hover:text-alerta"
          >
            ✕
          </button>
        </li>
      ))}
    </ul>
  );
}
