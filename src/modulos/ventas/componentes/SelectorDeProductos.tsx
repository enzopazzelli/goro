"use client";

import type { Presentacion } from "@/lib/presentaciones";
import type { ItemEnCarrito } from "../tipos";

export function SelectorDeProductos({
  presentaciones,
  onAgregar,
}: {
  presentaciones: Presentacion[];
  onAgregar: (item: ItemEnCarrito) => void;
}) {
  if (presentaciones.length === 0) return null;

  return (
    <div>
      <p className="mb-2 font-mono text-xs tracking-wide text-texto-suave uppercase">Productos</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {presentaciones.map((presentacion) => (
          <button
            key={presentacion.id}
            type="button"
            onClick={() =>
              onAgregar({
                tipo: "producto",
                presentacionId: presentacion.id,
                nombre: `${presentacion.insumoNombre} · ${presentacion.nombre}`,
                precio: presentacion.precio,
                saboresNombres: [],
              })
            }
            className="flex flex-col items-center gap-1 rounded-(--radius-arco) border border-linea bg-superficie p-3 text-center transition hover:bg-superficie-honda"
          >
            <span className="font-display font-semibold">{presentacion.insumoNombre}</span>
            <span className="font-mono text-xs opacity-70">{presentacion.nombre}</span>
            <span className="numero">${presentacion.precio}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
