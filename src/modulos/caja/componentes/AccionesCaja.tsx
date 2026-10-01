"use client";

import { useState } from "react";
import { Boton } from "@/componentes/Boton";
import { ETIQUETA_TIPO, TIPOS_MANUALES, type TipoManual } from "../tipos";
import { ModalCerrarCaja } from "./ModalCerrarCaja";
import { ModalMovimiento } from "./ModalMovimiento";

export function AccionesCaja() {
  const [tipo, setTipo] = useState<TipoManual | null>(null);
  const [cerrando, setCerrando] = useState(false);

  return (
    <div className="flex flex-wrap gap-2">
      {TIPOS_MANUALES.map((manual) => (
        <Boton key={manual} type="button" variante="suave" onClick={() => setTipo(manual)}>
          {ETIQUETA_TIPO[manual]}
        </Boton>
      ))}
      <Boton type="button" className="ml-auto" onClick={() => setCerrando(true)}>
        Cerrar caja
      </Boton>

      {/* Se montan al abrir: así cada vez arrancan en limpio, sin el error de la vez anterior. */}
      {tipo && <ModalMovimiento tipo={tipo} onCerrar={() => setTipo(null)} />}
      {cerrando && <ModalCerrarCaja onCerrar={() => setCerrando(false)} />}
    </div>
  );
}
