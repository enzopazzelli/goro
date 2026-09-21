"use client";

import { useState, type ReactNode } from "react";
import { Pildora } from "./Pildora";

export function Pestanas({ tabs }: { tabs: { etiqueta: string; contenido: ReactNode }[] }) {
  const [activa, setActiva] = useState(0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1">
        {tabs.map((tab, indice) => (
          <Pildora key={tab.etiqueta} activa={activa === indice} onClick={() => setActiva(indice)}>
            {tab.etiqueta}
          </Pildora>
        ))}
      </div>
      {tabs[activa]?.contenido}
    </div>
  );
}
