"use client";

import { useActionState } from "react";
import { Insignia } from "@/componentes/Insignia";
import { cambiarActivo } from "../consultas/accionesBaja";
import type { EstadoUsuario } from "../consultas/administracion";
import { ETIQUETA_ROL, type Perfil } from "../tipos";
import { resumenDePermisos } from "../permisos";

const INICIAL: EstadoUsuario = { error: null };
const ENLACE = "text-xs underline opacity-70 hover:opacity-100 disabled:opacity-40";

export type AccionDeFila = "editar" | "contrasena" | "borrar";

export function FilaUsuario({
  perfil,
  esPropio,
  onAccion,
}: {
  perfil: Perfil;
  esPropio: boolean;
  onAccion: (accion: AccionDeFila) => void;
}) {
  const [estado, accion, enviando] = useActionState(cambiarActivo, INICIAL);

  return (
    <tr className="border-b border-linea align-top last:border-0">
      <td className="numero p-3">
        {perfil.usuario}
        {esPropio && <span className="text-texto-suave"> (vos)</span>}
      </td>
      <td className="p-3">{perfil.nombre}</td>
      <td className="p-3">{ETIQUETA_ROL[perfil.rol]}</td>
      <td className="p-3 text-texto-suave">{resumenDePermisos(perfil)}</td>
      <td className="p-3">
        <Insignia variante={perfil.activo ? "ok" : "alerta"}>
          {perfil.activo ? "Activo" : "Inactivo"}
        </Insignia>
      </td>
      <td className="p-3">
        <div className="flex flex-wrap items-center justify-end gap-3">
          <button type="button" className={ENLACE} onClick={() => onAccion("editar")}>
            Editar
          </button>
          <button type="button" className={ENLACE} onClick={() => onAccion("contrasena")}>
            Contraseña
          </button>
          {/* En la fila propia no hay desactivar ni borrar: un clic no puede dejar al dueño afuera. */}
          {!esPropio && (
            <>
              <form action={accion}>
                <input type="hidden" name="id" value={perfil.id} />
                <input type="hidden" name="activo" value={String(!perfil.activo)} />
                <button type="submit" className={ENLACE} disabled={enviando}>
                  {perfil.activo ? "Desactivar" : "Activar"}
                </button>
              </form>
              <button type="button" className={ENLACE} onClick={() => onAccion("borrar")}>
                Borrar
              </button>
            </>
          )}
        </div>
        {estado.error && (
          <p role="alert" className="mt-1 text-right text-xs text-alerta">
            {estado.error}
          </p>
        )}
      </td>
    </tr>
  );
}
