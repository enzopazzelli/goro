export type Rol = "duenio" | "mostrador";

export type Perfil = {
  id: string;
  usuario: string;
  nombre: string;
  rol: Rol;
  activo: boolean;
};

export const ETIQUETA_ROL: Record<Rol, string> = {
  duenio: "Dueño",
  mostrador: "Mostrador",
};
