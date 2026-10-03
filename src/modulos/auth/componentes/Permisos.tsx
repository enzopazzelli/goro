"use client";

import { createContext, useContext, type ReactNode } from "react";
import { puede, type Permiso } from "../permisos";
import type { Perfil } from "../tipos";

type Quien = Pick<Perfil, "rol" | "permisos">;

/**
 * Sin proveedor no se puede nada: si una pantalla se monta fuera del layout, lo
 * que falla es que un botón no aparece, no que aparezca uno que no debía.
 */
const SIN_PERMISOS: Quien = { rol: "colaborador", permisos: [] };

const Contexto = createContext<Quien>(SIN_PERMISOS);

/**
 * Se pone una vez en el layout. Los botones de cada pantalla le preguntan a
 * `usePuede` en vez de recibir un `puedeX` desde tres niveles más arriba.
 * Ocultar un botón es comodidad: lo que frena de verdad es la base.
 */
export function ProveedorDePermisos({ perfil, children }: { perfil: Quien; children: ReactNode }) {
  return <Contexto value={{ rol: perfil.rol, permisos: perfil.permisos }}>{children}</Contexto>;
}

export function usePuede(permiso: Permiso): boolean {
  return puede(useContext(Contexto), permiso);
}

/** Muestra lo de adentro solo si quien mira tiene el permiso. */
export function SiPuede({ permiso, children }: { permiso: Permiso; children: ReactNode }) {
  return usePuede(permiso) ? children : null;
}
