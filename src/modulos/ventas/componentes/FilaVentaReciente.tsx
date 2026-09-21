"use client";

import { useActionState } from "react";
import type { Sabor } from "@/lib/sabores";
import type { VentaReciente } from "../tipos";
import { anularVenta } from "../consultas/acciones";
import { CorregirSaborItem } from "./CorregirSaborItem";

const INICIAL = { error: null };

const ETIQUETA_MEDIO: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
};

export function FilaVentaReciente({ venta, sabores }: { venta: VentaReciente; sabores: Sabor[] }) {
  const [estado, accion, enviando] = useActionState(anularVenta, INICIAL);

  return (
    <div className="flex flex-col gap-2 rounded-(--r) border border-linea p-3 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <span className="numero">#{venta.id}</span>
        <span>{ETIQUETA_MEDIO[venta.medioPago]}</span>
        <span className="numero font-semibold">${venta.total}</span>
        {venta.estado === "anulada" && <span className="text-xs text-alerta">Anulada</span>}
        {venta.estado === "cobrada" && (
          <form action={accion} className="flex items-center gap-2">
            <input type="hidden" name="ventaId" value={venta.id} />
            <button type="submit" disabled={enviando} className="text-xs underline opacity-70">
              {enviando ? "Anulando…" : "Anular"}
            </button>
          </form>
        )}
        {estado.error && (
          <span role="alert" className="text-xs text-alerta">
            {estado.error}
          </span>
        )}
      </div>

      <ul className="flex flex-col gap-1">
        {venta.items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center gap-2">
            <span>{item.formatoNombre}</span>
            <span className="numero">${item.precio}</span>
            {item.sabores.map((sabor) => (
              <CorregirSaborItem
                key={sabor.saborId}
                ventaItemId={item.id}
                saborActual={sabor}
                sabores={sabores}
                disabled={venta.estado !== "cobrada"}
              />
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}
