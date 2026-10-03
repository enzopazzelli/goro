"use client";

import { useActionState, useEffect, useRef } from "react";
import { Boton } from "@/componentes/Boton";
import type { Formato } from "@/lib/formatos";
import { formatearKilos } from "@/lib/kilos";
import { formatearPlata } from "@/lib/plata";
import { seleccionarAlEnfocar } from "@/lib/seleccionarAlEnfocar";
import { armarPote, type EstadoPote } from "../consultas/acciones";
import type { BaldeParaArmar } from "../tipos";

const INICIAL: EstadoPote = { error: null };
const ROTULO = "flex flex-col gap-1 font-mono text-xs tracking-wide text-texto-suave uppercase";
const CAMPO = "rounded-(--r) border border-linea bg-superficie px-3 py-2 text-sm";

/**
 * Se elige qué (formato y sabor), se pesa el pote y se tipea lo que marcó la
 * balanza. Al terminar el foco vuelve al peso: el siguiente pote suele ser del
 * mismo sabor y del mismo formato, y alcanza con pesar y apretar Enter.
 */
export function FormularioArmarPote({
  formatos,
  baldes,
  onArmado,
}: {
  formatos: Formato[];
  baldes: BaldeParaArmar[];
  onArmado: (poteId: number) => void;
}) {
  const peso = useRef<HTMLInputElement>(null);
  const [estado, accion, enviando] = useActionState(async (previo: EstadoPote, datos: FormData) => {
    const resultado = await armarPote(previo, datos);
    if (!resultado.error && resultado.poteId) onArmado(resultado.poteId);
    return resultado;
  }, INICIAL);

  // Después de armar, listo para el próximo peso; con error, el peso queda para corregirlo.
  useEffect(() => {
    if (estado.poteId && peso.current) {
      peso.current.value = "";
      peso.current.focus();
    }
  }, [estado]);

  if (formatos.length === 0 || baldes.length === 0) {
    return (
      <p className="text-sm text-texto-suave">
        {formatos.length === 0
          ? "No hay formatos activos: cargá uno en Inventario."
          : "No hay un balde abierto: abrí uno desde Inventario para poder armar potes."}
      </p>
    );
  }

  return (
    <form action={accion} className="flex flex-wrap items-end gap-3">
      <label className={ROTULO}>
        Formato
        <select name="formatoId" className={CAMPO}>
          {formatos.map((formato) => (
            <option key={formato.id} value={formato.id}>
              {formato.nombre} ({formato.gramos} g · {formatearPlata(formato.precio)})
            </option>
          ))}
        </select>
      </label>
      <label className={ROTULO}>
        Sabor
        <select name="baldeId" className={CAMPO}>
          {baldes.map((balde) => (
            <option key={balde.id} value={balde.id}>
              {balde.saborNombre} — quedan {formatearKilos(balde.kgRestante)}
            </option>
          ))}
        </select>
      </label>
      <label className={ROTULO}>
        Lo que marcó la balanza (g)
        <input
          ref={peso}
          type="number"
          name="pesoG"
          min="1"
          step="1"
          required
          autoFocus
          onFocus={seleccionarAlEnfocar}
          className={`numero w-40 ${CAMPO}`}
        />
      </label>
      <Boton type="submit" disabled={enviando}>
        {enviando ? "Armando…" : "Armar pote"}
      </Boton>
      {estado.error && (
        <p role="alert" className="w-full text-sm text-alerta">
          {estado.error}
        </p>
      )}
    </form>
  );
}
