import type { Rol } from "@/modulos/auth/tipos";

export type Modulo = {
  href: string;
  etiqueta: string;
  icono: string;
  /** Quiénes lo ven en el menú. La barrera real está en RLS, no acá. */
  roles: readonly Rol[];
};

const TODOS = ["duenio", "mostrador"] as const;
const SOLO_DUENIO = ["duenio"] as const;

/* El menú se arma desde una sola lista para que "quién ve qué" se lea de
   corrido, en vez de repartido en condicionales por toda la barra lateral.
   Ocultar un ítem es comodidad: que un mostrador no pueda VER los datos lo
   garantizan las políticas de Postgres, no este archivo. */
export const MODULOS: readonly Modulo[] = [
  { href: "/inicio", etiqueta: "Inicio", icono: "🍦", roles: TODOS },
  { href: "/codigos", etiqueta: "Códigos", icono: "🏷️", roles: TODOS },
  { href: "/usuarios", etiqueta: "Usuarios", icono: "👥", roles: SOLO_DUENIO },
];

export function modulosDe(rol: Rol): readonly Modulo[] {
  return MODULOS.filter((modulo) => modulo.roles.includes(rol));
}
