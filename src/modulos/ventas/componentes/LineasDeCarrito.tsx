"use client";

import { Punto } from "@/componentes/Punto";
import type { Sabor } from "@/lib/sabores";
import { formatearPlata } from "@/lib/plata";
import { saborIdsDe } from "../ticket";
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
            <div className="text-base font-semibold">
              {item.nombre} · <span className="numero">{formatearPlata(item.precio)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-texto-suave">
              {saborIdsDe(item).map((saborId) => {
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
            aria-label={`Quitar ${item.nombre}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-texto-suave transition hover:bg-alerta-fondo hover:text-alerta"
          >
            ✕
          </button>
        </li>
      ))}
    </ul>
  );
}
