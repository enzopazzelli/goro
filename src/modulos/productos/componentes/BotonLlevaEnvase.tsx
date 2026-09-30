"use client";

import { useActionState } from "react";
import { crearEnvase } from "../consultas/acciones";

const INICIAL = { error: null };

/**
 * Un formato que se sirve en cono, canasta o vasito puede llevar ese envase
 * con stock propio: se descuenta solo al vender con helado y se vende suelto
 * "sin helado". Un pote no lo necesita, por eso es opt-in.
 */
export function BotonLlevaEnvase({ formatoId }: { formatoId: number }) {
  const [estado, accion, creando] = useActionState(crearEnvase, INICIAL);

  return (
    <form action={accion} className="flex flex-wrap items-center gap-2 pl-2 text-xs">
      <input type="hidden" name="formatoId" value={formatoId} />
      <button type="submit" disabled={creando} className="text-texto-suave underline">
        {creando ? "Creando…" : "Lleva envase (cono, canasta o vasito)"}
      </button>
      {estado.error && (
        <span role="alert" className="text-alerta">
          {estado.error}
        </span>
      )}
    </form>
  );
}
