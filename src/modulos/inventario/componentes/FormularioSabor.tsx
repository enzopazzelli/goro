"use client";

import { useRef } from "react";
import { Boton } from "@/componentes/Boton";
import { Campo } from "@/componentes/Campo";
import { PALETA_SABORES_SUGERIDA } from "@/config/paletaSabores";
import { useAccionConReset } from "@/lib/useAccionConReset";
import { crearSabor } from "../consultas/accionesSabores";

const INICIAL = { error: null };

export function FormularioSabor() {
  const { estado, accion, enviando, formRef } = useAccionConReset(crearSabor, INICIAL);
  const colorRef = useRef<HTMLInputElement>(null);

  return (
    <form ref={formRef} action={accion} className="flex flex-wrap items-end gap-2">
      <Campo id="nombre-sabor" name="nombre" etiqueta="Sabor nuevo" required />
      <div className="flex flex-col gap-1">
        <span className="font-mono text-xs font-semibold tracking-wide text-texto-suave uppercase">
          Color
        </span>
        <div className="flex items-center gap-2">
          <div className="flex flex-wrap gap-1">
            {PALETA_SABORES_SUGERIDA.map((tono) => (
              <button
                key={tono}
                type="button"
                aria-label={`Usar el color ${tono}`}
                onClick={() => {
                  if (colorRef.current) colorRef.current.value = tono;
                }}
                className="h-6 w-6 rounded-full border border-marco/20"
                style={{ backgroundColor: tono }}
              />
            ))}
          </div>
          <input
            ref={colorRef}
            type="color"
            name="color"
            defaultValue={PALETA_SABORES_SUGERIDA[0]}
            aria-label="Color del sabor"
            className="h-8 w-10 rounded-(--r) border border-linea bg-superficie p-0.5"
          />
        </div>
      </div>
      <Boton type="submit" disabled={enviando}>
        {enviando ? "Creando…" : "Agregar"}
      </Boton>
      {estado.error && (
        <p role="alert" className="text-sm text-alerta">
          {estado.error}
        </p>
      )}
    </form>
  );
}
