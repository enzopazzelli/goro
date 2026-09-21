"use client";

import { useState } from "react";
import { Insignia } from "@/componentes/Insignia";
import type { Balde } from "@/lib/baldes";
import type { Sabor } from "@/lib/sabores";
import { FilaSaborExpandible, type InsigniaSabor } from "./FilaSaborExpandible";

export type FilaSaborVista = {
  sabor: Sabor;
  baldes: Balde[];
  pct: number;
  insignia: InsigniaSabor;
  baldeAbiertoId: number | null;
};

export function TablaSabores({ filas, esDuenio }: { filas: FilaSaborVista[]; esDuenio: boolean }) {
  const [busqueda, setBusqueda] = useState("");
  const filtradas = filas.filter((fila) =>
    fila.sabor.nombre.toLowerCase().includes(busqueda.toLowerCase()),
  );
  const bajos = filas.filter((fila) => fila.insignia.variante !== "ok").length;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          placeholder="Buscar sabor…"
          aria-label="Buscar sabor"
          className="min-w-40 flex-1 rounded-full border border-linea bg-superficie px-3 py-1.5 text-sm"
        />
        <Insignia variante={bajos > 0 ? "advertencia" : "ok"}>
          {bajos > 0 ? `${bajos} por debajo del mínimo` : "Todo por encima del mínimo"}
        </Insignia>
      </div>

      {filtradas.length === 0 ? (
        <p className="text-sm text-texto-suave">Ningún sabor con ese nombre.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="border-b border-linea font-mono text-xs text-texto-suave uppercase">
            <tr>
              <th className="p-2 font-normal">Balde</th>
              <th className="p-2 font-normal">Sabor</th>
              <th className="p-2 font-normal">Mínimo (kg)</th>
              <th className="p-2 font-normal">Estado</th>
              <th className="p-2 font-normal" colSpan={2}></th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((fila) => (
              <FilaSaborExpandible key={fila.sabor.id} {...fila} esDuenio={esDuenio} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
