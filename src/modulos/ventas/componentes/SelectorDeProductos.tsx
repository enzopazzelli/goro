"use client";

import { etiquetaPresentacion } from "@/lib/etiquetaPresentacion";
import type { Presentacion } from "@/lib/presentaciones";
import { formatearPlata } from "@/lib/plata";
import { itemDePresentacion } from "../itemDePresentacion";
import type { ItemEnCarrito } from "../tipos";
import { DETALLE, NOMBRE, PRECIO, ROTULO_DE_GRUPO, TARJETA, TARJETA_LIBRE } from "./estilosDeVenta";

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
      <p className={ROTULO_DE_GRUPO}>Productos</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {presentaciones.map((presentacion) => (
          <button
            key={presentacion.id}
            type="button"
            onClick={() => onAgregar(itemDePresentacion(presentacion))}
            className={`${TARJETA} ${TARJETA_LIBRE}`}
          >
            <span className={NOMBRE}>{presentacion.insumoNombre}</span>
            <span className={DETALLE}>
              {etiquetaPresentacion(presentacion.nombre, presentacion.unidades)}
            </span>
            <span className={PRECIO}>{formatearPlata(presentacion.precio)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
