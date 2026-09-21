"use client";

import { useState } from "react";
import { Insignia } from "@/componentes/Insignia";
import type { Insumo } from "../tipos";
import { FilaInsumoExpandible } from "./FilaInsumoExpandible";

export function TablaInsumos({ insumos, esDuenio }: { insumos: Insumo[]; esDuenio: boolean }) {
  const [busqueda, setBusqueda] = useState("");
  const filtrados = insumos.filter((insumo) =>
    insumo.nombre.toLowerCase().includes(busqueda.toLowerCase()),
  );
  const bajos = insumos.filter((insumo) => insumo.cantidad <= insumo.minimo).length;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          placeholder="Buscar insumo…"
          aria-label="Buscar insumo"
          className="min-w-40 flex-1 rounded-full border border-linea bg-superficie px-3 py-1.5 text-sm"
        />
        <Insignia variante={bajos > 0 ? "advertencia" : "ok"}>
          {bajos > 0 ? `${bajos} por debajo del mínimo` : "Todo por encima del mínimo"}
        </Insignia>
      </div>

      {filtrados.length === 0 ? (
        <p className="text-sm text-texto-suave">Ningún insumo con ese nombre.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {filtrados.map((insumo) => (
            <FilaInsumoExpandible key={insumo.id} insumo={insumo} esDuenio={esDuenio} />
          ))}
        </div>
      )}
    </div>
  );
}
