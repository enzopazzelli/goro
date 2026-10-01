"use client";

import { useState } from "react";
import { Pildora } from "@/componentes/Pildora";
import { ETIQUETA_TIPO, type MovimientoCaja, type TipoMovimientoCaja } from "../tipos";
import { FilaMovimiento } from "./FilaMovimiento";

const ORDEN: TipoMovimientoCaja[] = ["venta", "ingreso", "gasto", "retiro", "anulacion"];

export function TablaMovimientos({
  movimientos,
  nombres,
  sePuedeAnular,
}: {
  movimientos: MovimientoCaja[];
  /** Solo la vista del dueño lo manda. */
  nombres?: Record<string, string>;
  sePuedeAnular: boolean;
}) {
  const [filtro, setFiltro] = useState<TipoMovimientoCaja | null>(null);

  // Solo se ofrecen los tipos que el turno tiene: un filtro que da vacío no ayuda.
  const presentes = ORDEN.filter((tipo) => movimientos.some((m) => m.tipo === tipo));
  const visibles = filtro ? movimientos.filter((m) => m.tipo === filtro) : movimientos;

  return (
    <div className="flex flex-col gap-3">
      {presentes.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <Pildora activa={filtro === null} onClick={() => setFiltro(null)}>
            Todos
          </Pildora>
          {presentes.map((tipo) => (
            <Pildora key={tipo} activa={filtro === tipo} onClick={() => setFiltro(tipo)}>
              {ETIQUETA_TIPO[tipo]}
            </Pildora>
          ))}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-linea font-mono text-xs text-texto-suave uppercase">
            <tr>
              <th className="p-2 font-normal">Hora</th>
              <th className="p-2 font-normal">Movimiento</th>
              <th className="p-2 font-normal">Detalle</th>
              <th className="p-2 text-right font-normal">Monto</th>
              <th className="p-2 font-normal"></th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((movimiento) => (
              <FilaMovimiento
                key={movimiento.id}
                movimiento={movimiento}
                quien={nombres?.[movimiento.creadoPor]}
                sePuedeAnular={sePuedeAnular}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
