"use client";

import { useState } from "react";
import { Boton } from "@/componentes/Boton";
import { Insignia } from "@/componentes/Insignia";
import { Pildora } from "@/componentes/Pildora";
import type { FilaSaborVista, Insumo } from "../tipos";
import { TablaInsumos } from "./TablaInsumos";
import { TablaSabores } from "./TablaSabores";

type Pestana = "sabores" | "insumos";

export function PanelStock({
  filasSabores,
  insumos,
  esDuenio,
}: {
  filasSabores: FilaSaborVista[];
  insumos: Insumo[];
  esDuenio: boolean;
}) {
  const [pestana, setPestana] = useState<Pestana>("sabores");
  const [busqueda, setBusqueda] = useState("");
  const [densidad, setDensidad] = useState<"comoda" | "compacta">("comoda");

  function cambiarPestana(siguiente: Pestana) {
    setPestana(siguiente);
    setBusqueda("");
  }

  const q = busqueda.toLowerCase();
  const filasFiltradas = filasSabores.filter((fila) => fila.sabor.nombre.toLowerCase().includes(q));
  const insumosFiltrados = insumos.filter((insumo) => insumo.nombre.toLowerCase().includes(q));
  const bajos =
    pestana === "sabores"
      ? filasSabores.filter((fila) => fila.insignia.variante !== "ok").length
      : insumos.filter((insumo) => insumo.cantidad <= insumo.minimo).length;

  return (
    <div
      className="flex flex-col gap-2"
      data-densidad={densidad === "compacta" ? "compacta" : undefined}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          <Pildora activa={pestana === "sabores"} onClick={() => cambiarPestana("sabores")}>
            Sabores
          </Pildora>
          <Pildora activa={pestana === "insumos"} onClick={() => cambiarPestana("insumos")}>
            Insumos
          </Pildora>
        </div>
        <input
          type="search"
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          placeholder="Buscar…"
          aria-label={pestana === "sabores" ? "Buscar sabor" : "Buscar insumo"}
          className="min-w-40 flex-1 rounded-full border border-linea bg-superficie px-3 py-1.5 text-sm"
        />
        <Insignia variante={bajos > 0 ? "advertencia" : "ok"}>
          {bajos > 0 ? `${bajos} por debajo del mínimo` : "Todo por encima del mínimo"}
        </Insignia>
        <Boton
          type="button"
          variante="suave"
          title="Cambiar la altura de las filas"
          onClick={() => setDensidad((actual) => (actual === "compacta" ? "comoda" : "compacta"))}
          className="px-3 py-1.5 text-xs"
        >
          ☰ Densidad
        </Boton>
      </div>

      {pestana === "sabores" ? (
        <TablaSabores filas={filasFiltradas} esDuenio={esDuenio} />
      ) : (
        <TablaInsumos insumos={insumosFiltrados} esDuenio={esDuenio} />
      )}
    </div>
  );
}
