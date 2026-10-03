"use client";

import { SiPuede } from "@/modulos/auth/componentes/Permisos";
import { useState } from "react";
import { etiquetaPresentacion, textoPrecio } from "@/lib/etiquetaPresentacion";
import type { Presentacion } from "@/lib/presentaciones";
import { formatearPlata } from "@/lib/plata";
import { PresentacionesInsumo } from "@/modulos/productos/componentes/PresentacionesInsumo";
import type { Insumo } from "../tipos";
import { FormularioEdicionInsumo } from "./FormularioEdicionInsumo";
import { InsigniaStock } from "./InsigniaStock";
import { ModalCargarInsumo } from "./ModalCargarInsumo";

export function FilaProducto({
  producto,
  presentaciones,
  esDuenio,
}: {
  producto: Insumo;
  presentaciones: Presentacion[];
  esDuenio: boolean;
}) {
  const [expandida, setExpandida] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);

  return (
    <>
      <tr className="border-b border-linea last:border-0">
        <td className="px-2 py-[var(--fila-y)] font-semibold">{producto.nombre}</td>
        <td className="numero px-2 py-[var(--fila-y)]">{producto.cantidad} u</td>
        <td className="numero px-2 py-[var(--fila-y)]">{formatearPlata(producto.costo)}</td>
        <td className="px-2 py-[var(--fila-y)]">
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            {presentaciones.map((presentacion) => (
              <span key={presentacion.id} className="whitespace-nowrap">
                {etiquetaPresentacion(presentacion.nombre, presentacion.unidades)}{" "}
                <span className="numero font-semibold">{textoPrecio(presentacion)}</span>
              </span>
            ))}
          </div>
        </td>
        <td className="px-2 py-[var(--fila-y)]">
          <InsigniaStock cantidad={producto.cantidad} minimo={producto.minimo} />
        </td>
        <td className="px-2 py-[var(--fila-y)]">
          <SiPuede permiso="cargar_inventario">
            <button
              type="button"
              onClick={() => setModalAbierto(true)}
              className="text-xs underline opacity-70"
            >
              Cargar
            </button>
          </SiPuede>
        </td>
        <td className="px-2 py-[var(--fila-y)]">
          {esDuenio && (
            <button
              type="button"
              onClick={() => setExpandida((actual) => !actual)}
              aria-expanded={expandida}
              className="text-xs text-texto-suave"
            >
              {expandida ? "▲" : "▼"}
            </button>
          )}
        </td>
      </tr>

      {expandida && esDuenio && (
        <tr className="border-b border-linea bg-superficie-honda last:border-0">
          <td colSpan={7} className="p-2">
            <div className="flex flex-col gap-3">
              <FormularioEdicionInsumo insumo={producto} conUnidad={false} />
              <PresentacionesInsumo insumoId={producto.id} presentaciones={presentaciones} />
            </div>
          </td>
        </tr>
      )}

      <ModalCargarInsumo
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        insumoId={producto.id}
        insumoNombre={producto.nombre}
      />
    </>
  );
}
