import type { Permiso } from "./permisos";

export type Rol = "duenio" | "colaborador";

export type Perfil = {
  id: string;
  usuario: string;
  nombre: string;
  rol: Rol;
  activo: boolean;
  /** Lo que un colaborador puede hacer además de vender. El dueño no lo necesita: puede todo. */
  permisos: Permiso[];
};

export const ETIQUETA_ROL: Record<Rol, string> = {
  duenio: "Dueño",
  colaborador: "Colaborador",
};
