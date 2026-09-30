"use client";

import { useState } from "react";
import { Boton } from "@/componentes/Boton";
import { Insignia } from "@/componentes/Insignia";
import { Pildora } from "@/componentes/Pildora";
import type { Presentacion } from "@/lib/presentaciones";
import { estadoDeInsumo } from "../alerta";
import type { FilaSaborVista, Insumo } from "../tipos";
import { TablaInsumos } from "./TablaInsumos";
import { TablaProductos } from "./TablaProductos";
import { TablaSabores } from "./TablaSabores";

type Pestana = "sabores" | "insumos" | "productos";

const ETIQUETA_BUSQUEDA: Record<Pestana, string> = {
  sabores: "Buscar sabor",
  insumos: "Buscar insumo",
  productos: "Buscar producto",
};

export function PanelStock({
  filasSabores,
  insumos,
  presentaciones,
  esDuenio,
}: {
  filasSabores: FilaSaborVista[];
  insumos: Insumo[];
  presentaciones: Presentacion[];
  esDuenio: boolean;
}) {
  const [pestana, setPestana] = useState<Pestana>("sabores");
  const [busqueda, setBusqueda] = useState("");
  const [densidad, setDensidad] = useState<"comoda" | "compacta">("comoda");

  function cambiarPestana(siguiente: Pestana) {
    setPestana(siguiente);
    setBusqueda("");
  }

  // Los envases no aparecen acá: cuelgan de su formato y se manejan desde él.
  const q = busqueda.toLowerCase();
  const coincide = (nombre: string) => nombre.toLowerCase().includes(q);
  const soloInsumos = insumos.filter((insumo) => insumo.tipo === "insumo");
  const soloProductos = insumos.filter((insumo) => insumo.tipo === "producto");
  const filasFiltradas = filasSabores.filter((fila) => coincide(fila.sabor.nombre));
  const deLaPestana = pestana === "productos" ? soloProductos : soloInsumos;
  const bajos =
    pestana === "sabores"
      ? filasSabores.filter((fila) => fila.insignia.variante !== "ok").length
      : deLaPestana.filter((insumo) => estadoDeInsumo(insumo.cantidad, insumo.minimo) !== "ok")
          .length;

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
          <Pildora activa={pestana === "productos"} onClick={() => cambiarPestana("productos")}>
            Productos
          </Pildora>
        </div>
        <input
          type="search"
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          placeholder="Buscar…"
          aria-label={ETIQUETA_BUSQUEDA[pestana]}
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

      {pestana === "sabores" && <TablaSabores filas={filasFiltradas} esDuenio={esDuenio} />}
      {pestana === "insumos" && (
        <TablaInsumos insumos={soloInsumos.filter((i) => coincide(i.nombre))} esDuenio={esDuenio} />
      )}
      {pestana === "productos" && (
        <TablaProductos
          productos={soloProductos.filter((i) => coincide(i.nombre))}
          presentaciones={presentaciones}
          esDuenio={esDuenio}
        />
      )}
    </div>
  );
}
