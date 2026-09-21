"use client";

import { useActionState, useState } from "react";
import { Insignia } from "@/componentes/Insignia";
import type { Sabor } from "@/lib/sabores";
import { ETIQUETA_MEDIO_PAGO, type VentaReciente } from "../tipos";
import { anularVenta } from "../consultas/acciones";
import { CorregirSaborItem } from "./CorregirSaborItem";
import { DetalleTicket, type ItemParaDetalle } from "./DetalleTicket";

const INICIAL = { error: null };

export function FilaVentaReciente({ venta, sabores }: { venta: VentaReciente; sabores: Sabor[] }) {
  const [estado, accion, enviando] = useActionState(anularVenta, INICIAL);
  const [expandida, setExpandida] = useState(false);

  const itemsParaDetalle: ItemParaDetalle[] = venta.items.map((item) => ({
    key: item.id,
    formatoNombre: item.formatoNombre,
    precio: item.precio,
    sabores: item.sabores.map((sabor) => (
      <CorregirSaborItem
        key={sabor.saborId}
        ventaItemId={item.id}
        saborActual={sabor}
        sabores={sabores}
        disabled={venta.estado !== "cobrada"}
      />
    )),
  }));

  return (
    <div className="rounded-(--r) border border-linea bg-superficie p-3 font-mono text-sm">
      <button
        type="button"
        onClick={() => setExpandida((actual) => !actual)}
        aria-expanded={expandida}
        className="flex w-full flex-wrap items-center justify-between gap-2 text-left"
      >
        <span>
          #{venta.id} · {ETIQUETA_MEDIO_PAGO[venta.medioPago]}
        </span>
        <span className="flex items-center gap-2">
          {venta.estado === "anulada" && <Insignia variante="alerta">Anulada</Insignia>}
          <span className="numero font-semibold">${venta.total}</span>
          <span aria-hidden="true" className="text-texto-suave">
            {expandida ? "▲" : "▼"}
          </span>
        </span>
      </button>

      {expandida && (
        <div className="mt-3 flex flex-col gap-3">
          <p className="text-xs text-texto-suave">
            {new Date(venta.creadoEn).toLocaleString("es-AR")}
          </p>

          <DetalleTicket items={itemsParaDetalle} medioPago={venta.medioPago} total={venta.total} />

          {venta.estado === "cobrada" && (
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
      )}
    </div>
  );
}
