"use client";

import { useActionState, useState } from "react";
import { insumosParaConsumo } from "../consumo";
import type { ConsumoDeFormato, Insumo } from "../tipos";
import { quitarConsumo } from "../consultas/accionesFormatos";
import { FormularioAgregarConsumo } from "./FormularioAgregarConsumo";

const INICIAL = { error: null };

export function ConsumoFormato({
  formatoId,
  consumos,
  insumos,
  esDuenio,
}: {
  formatoId: number;
  consumos: ConsumoDeFormato[];
  insumos: Insumo[];
  esDuenio: boolean;
}) {
  const [estadoQuitar, accionQuitar, quitando] = useActionState(quitarConsumo, INICIAL);
  const [abierto, setAbierto] = useState(false);
  const elegibles = insumosParaConsumo(insumos);

  // La mayoría de los formatos (un pote) no consume nada: no se les muestra la
  // fila hasta que el dueño la pide, salvo que ya tengan algo configurado.
  if (consumos.length === 0 && !abierto) {
    if (!esDuenio) return null;
    return (
      <div className="pl-2 text-xs">
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="text-texto-suave underline"
        >
          Configurar consumo
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 pl-2 text-xs">
      <span className="text-texto-suave">Consume:</span>
      {consumos.length === 0 && <span className="text-texto-suave">nada</span>}
      {consumos.map((consumo) =>
        esDuenio ? (
          <form key={consumo.insumoId} action={accionQuitar} className="flex items-center gap-1">
            <input type="hidden" name="formatoId" value={formatoId} />
            <input type="hidden" name="insumoId" value={consumo.insumoId} />
            <span>
              {consumo.insumoNombre} × {consumo.cantidad}
            </span>
            <button
              type="submit"
              disabled={quitando}
              aria-label={`Quitar ${consumo.insumoNombre}`}
              className="text-texto-suave hover:text-alerta"
            >
              ✕
            </button>
          </form>
        ) : (
          <span key={consumo.insumoId}>
            {consumo.insumoNombre} × {consumo.cantidad}
          </span>
        ),
      )}

      {esDuenio && elegibles.length === 0 && (
        <span className="text-texto-suave">
          Ningún insumo está marcado como componente (se marca al editarlo en Stock).
        </span>
      )}
      {esDuenio && elegibles.length > 0 && (
        <FormularioAgregarConsumo formatoId={formatoId} elegibles={elegibles} />
      )}
      {esDuenio && consumos.length === 0 && (
        <button type="button" onClick={() => setAbierto(false)} className="underline opacity-70">
          Cerrar
        </button>
      )}
      {estadoQuitar.error && (
        <span role="alert" className="text-alerta">
          {estadoQuitar.error}
        </span>
      )}
    </div>
  );
}
