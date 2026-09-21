"use client";

import { useActionState } from "react";
import { Insignia } from "@/componentes/Insignia";
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
    <div className="rounded-(--r) border border-linea bg-superficie p-3 font-mono text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>
          #{venta.id} · {ETIQUETA_MEDIO[venta.medioPago]}
        </span>
        <span className="numero font-semibold">${venta.total}</span>
      </div>

      <div className="my-2 border-t border-dashed border-linea" />

      <ul className="flex flex-col gap-2">
        {venta.items.map((item) => (
          <li key={item.id} className="flex flex-col gap-1">
            <div className="flex justify-between gap-2">
              <span>{item.formatoNombre}</span>
              <span className="numero">${item.precio}</span>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {item.sabores.map((sabor) => (
                <CorregirSaborItem
                  key={sabor.saborId}
                  ventaItemId={item.id}
                  saborActual={sabor}
                  sabores={sabores}
                  disabled={venta.estado !== "cobrada"}
                />
              ))}
            </div>
          </li>
        ))}
      </ul>

      <div className="my-2 border-t border-dashed border-linea" />

      <div className="flex items-center justify-between gap-2">
        {venta.estado === "anulada" ? (
          <Insignia variante="alerta">Anulada</Insignia>
        ) : (
          <form action={accion}>
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
    </div>
  );
}
