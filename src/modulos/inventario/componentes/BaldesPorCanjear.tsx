"use client";

import { useActionState } from "react";
import { Boton } from "@/componentes/Boton";
import type { BaldeVacio } from "@/lib/baldes";
import { diaYHoraDe } from "@/lib/fechas";
import { SiPuede } from "@/modulos/auth/componentes/Permisos";
import { canjearBaldes } from "../consultas/accionesCicloBalde";

const INICIAL = { error: null };

/**
 * Los baldes que se terminaron y todavía están acá. Se entregan juntos al
 * proveedor, así que la acción es una sola: "los entregué" sobre todos los que
 * se tildaron (arrancan todos tildados, que es el caso de siempre). Los baldes
 * nuevos que vuelven se cargan por "Balde nuevo", como cualquier otro.
 */
export function BaldesPorCanjear({ baldes }: { baldes: BaldeVacio[] }) {
  const [estado, accion, enviando] = useActionState(canjearBaldes, INICIAL);

  return (
    <form action={accion} className="flex flex-col gap-2">
      <div>
        <h2 className="font-display text-base font-semibold">
          Vacíos para entregar al proveedor ({baldes.length})
        </h2>
        <p className="text-sm text-texto-suave">
          Se terminaron en el mostrador. Cuando los entregues, tocá el botón: así queda registrado
          que volvieron (y que no costaron un envase).
        </p>
      </div>

      <ul className="flex flex-col gap-1 text-sm">
        {baldes.map((balde) => (
          <li key={balde.id}>
            <label className="flex flex-wrap items-center gap-2">
              <input type="checkbox" name="baldeId" value={balde.id} defaultChecked />
              <span className="font-semibold">{balde.saborNombre}</span>
              <span className="numero text-texto-suave">{balde.codigo}</span>
              <span className="text-xs text-texto-suave">terminó {diaYHoraDe(balde.salioEn)}</span>
            </label>
          </li>
        ))}
      </ul>

      <SiPuede permiso="cargar_inventario">
        <div className="flex items-center gap-3">
          <Boton type="submit" variante="suave" disabled={enviando}>
            {enviando ? "Guardando…" : "Los entregué al proveedor"}
          </Boton>
          {estado.error && (
            <span role="alert" className="text-sm text-alerta">
              {estado.error}
            </span>
          )}
        </div>
      </SiPuede>
    </form>
  );
}
