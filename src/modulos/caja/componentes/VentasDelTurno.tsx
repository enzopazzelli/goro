"use client";

import { useState } from "react";
import { Insignia } from "@/componentes/Insignia";
import { Pildora } from "@/componentes/Pildora";
import { horaDe } from "@/lib/fechas";
import { formatearPlata } from "@/lib/plata";
import { ETIQUETA_MEDIO_PAGO, type MedioPago } from "@/modulos/ventas/tipos";
import type { VentaDelTurno } from "../tipos";

const MEDIOS: MedioPago[] = ["efectivo", "tarjeta", "transferencia"];

/**
 * Las ventas del turno por medio de pago. La transferencia y la tarjeta no
 * pasan por el cajón, pero Goro las controla igual: contra su cuenta, como el
 * efectivo contra el arqueo.
 */
export function VentasDelTurno({
  ventas,
  porMedio,
}: {
  ventas: VentaDelTurno[];
  /** Totales cobrados (sin anuladas), ya calculados por resumenDelTurno. */
  porMedio: Record<MedioPago, number>;
}) {
  const [medio, setMedio] = useState<MedioPago | null>(null);
  const visibles = medio ? ventas.filter((venta) => venta.medioPago === medio) : ventas;
  const totalTodos = MEDIOS.reduce((suma, cada) => suma + porMedio[cada], 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1">
        <Pildora activa={medio === null} onClick={() => setMedio(null)}>
          Todas · <span className="numero">{formatearPlata(totalTodos)}</span>
        </Pildora>
        {MEDIOS.map((cada) => (
          <Pildora key={cada} activa={medio === cada} onClick={() => setMedio(cada)}>
            {ETIQUETA_MEDIO_PAGO[cada]} ·{" "}
            <span className="numero">{formatearPlata(porMedio[cada])}</span>
          </Pildora>
        ))}
      </div>

      {visibles.length === 0 ? (
        <p className="text-sm text-texto-suave">
          {medio
            ? `Ninguna venta con ${ETIQUETA_MEDIO_PAGO[medio].toLowerCase()} en este turno.`
            : "Todavía no se vendió nada en este turno."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-linea font-mono text-xs text-texto-suave uppercase">
              <tr>
                <th className="p-2 font-normal">Hora</th>
                <th className="p-2 font-normal">Venta</th>
                <th className="p-2 font-normal">Medio</th>
                <th className="p-2 text-right font-normal">Total</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((venta) => (
                <tr key={venta.id} className="border-b border-linea last:border-0">
                  <td className="numero p-2 text-texto-suave">{horaDe(venta.creadoEn)}</td>
                  <td className="numero p-2">
                    #{venta.id}{" "}
                    {venta.estado === "anulada" && <Insignia variante="alerta">Anulada</Insignia>}
                  </td>
                  <td className="p-2">{ETIQUETA_MEDIO_PAGO[venta.medioPago]}</td>
                  <td
                    className={`numero p-2 text-right ${
                      venta.estado === "anulada" ? "line-through opacity-55" : ""
                    }`}
                  >
                    {formatearPlata(venta.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
