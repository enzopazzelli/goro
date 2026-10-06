"use client";

import { useState } from "react";
import { Boton } from "@/componentes/Boton";
import { ModalSeTermino } from "./ModalSeTermino";

/**
 * "Se terminó": el balde sale del mostrador y queda esperando el canje. Antes
 * de confirmar se pregunta cuánto se tiró, para que el resto quede como
 * descarte y no mezclado con el error de la estimación.
 */
export function BotonVaciarBalde({
  baldeId,
  codigo,
  saborNombre,
  kgRestante,
}: {
  baldeId: number;
  codigo: string;
  saborNombre: string;
  kgRestante: number;
}) {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <Boton type="button" variante="peligro" tamano="chico" onClick={() => setAbierto(true)}>
        Se terminó
      </Boton>
      <ModalSeTermino
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        baldeId={baldeId}
        codigo={codigo}
        saborNombre={saborNombre}
        kgRestante={kgRestante}
      />
    </>
  );
}
