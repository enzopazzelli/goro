"use client";

import { useState, type ReactNode } from "react";
import { Pildora } from "./Pildora";

export function Pestanas({
  etiquetaVer = "Ver",
  etiquetaCargar = "Cargar",
  ver,
  cargar,
}: {
  etiquetaVer?: string;
  etiquetaCargar?: string;
  ver: ReactNode;
  cargar: ReactNode;
}) {
  const [pestana, setPestana] = useState<"ver" | "cargar">("ver");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1">
        <Pildora activa={pestana === "ver"} onClick={() => setPestana("ver")}>
          {etiquetaVer}
        </Pildora>
        <Pildora activa={pestana === "cargar"} onClick={() => setPestana("cargar")}>
          {etiquetaCargar}
        </Pildora>
      </div>
      {pestana === "ver" ? ver : cargar}
    </div>
  );
}
