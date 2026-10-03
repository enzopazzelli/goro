"use client";

import { useState } from "react";
import { PERMISOS, TODOS_LOS_PERMISOS, type Permiso } from "../permisos";
import type { Rol } from "../tipos";
import { SelectorRol } from "./CamposDeUsuario";

const ROTULO = "font-mono text-xs font-semibold tracking-wide text-texto-suave uppercase";

/**
 * El rol y, debajo, lo que puede hacer un colaborador. Un dueño puede todo, así
 * que al elegir ese rol la lista desaparece en vez de mostrar casillas que no
 * cambian nada. Quien vende siempre puede vender: acá solo se tilda lo extra.
 */
export function RolYPermisos({
  rolInicial,
  permisosIniciales = TODOS_LOS_PERMISOS,
  rolFijo = false,
}: {
  rolInicial: Rol;
  permisosIniciales?: readonly Permiso[];
  rolFijo?: boolean;
}) {
  const [rol, setRol] = useState<Rol>(rolInicial);

  return (
    <>
      <SelectorRol inicial={rolInicial} fijo={rolFijo} onCambiar={setRol} />
      {rol === "colaborador" ? (
        <fieldset className="flex flex-col gap-2">
          <legend className={ROTULO}>Además de vender, puede</legend>
          {PERMISOS.map((permiso) => (
            <label key={permiso.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="permisos"
                value={permiso.id}
                defaultChecked={permisosIniciales.includes(permiso.id)}
              />
              {permiso.etiqueta}
            </label>
          ))}
        </fieldset>
      ) : (
        <p className="text-xs text-texto-suave">El dueño puede hacer todo.</p>
      )}
    </>
  );
}
