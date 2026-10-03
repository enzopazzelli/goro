import type { Rol } from "./tipos";

/**
 * Lo que el dueño puede darle o sacarle a un colaborador. Es una lista fija y
 * corta a propósito: las acciones que mueven plata o stock, nada más. El dueño
 * puede todo siempre, y abrir un balde queda fuera porque sin eso no se puede
 * seguir vendiendo.
 *
 * Los mismos ids están en el `check` de `perfiles.permisos` y en las funciones
 * de Postgres que los exigen (`tiene_permiso`): un permiso nuevo se agrega acá,
 * en ese `check` y en la función que protege.
 */
export const PERMISOS = [
  {
    id: "anular_ventas",
    etiqueta: "Anular ventas y corregir sabores",
  },
  {
    id: "movimientos_caja",
    etiqueta: "Registrar gastos, ingresos y retiros de caja",
  },
  {
    id: "cargar_inventario",
    etiqueta: "Cargar mercadería, baldes y ajustes de stock",
  },
] as const;

export type Permiso = (typeof PERMISOS)[number]["id"];

export const TODOS_LOS_PERMISOS: readonly Permiso[] = PERMISOS.map((permiso) => permiso.id);

/** Para lo que llega de afuera (un formulario): un cast no es un chequeo. */
export function esPermiso(valor: string): valor is Permiso {
  return TODOS_LOS_PERMISOS.includes(valor as Permiso);
}

type ConPermisos = { rol: Rol; permisos: readonly Permiso[] };

/**
 * El dueño puede todo; un colaborador, lo que esté en su lista. Esto es solo
 * para mostrar u ocultar botones: la barrera de verdad es `tiene_permiso` en
 * la base, que es lo que frena a quien llame la API sin pasar por la pantalla.
 */
export function puede(perfil: ConPermisos, permiso: Permiso): boolean {
  return perfil.rol === "duenio" || perfil.permisos.includes(permiso);
}

/** "Anular ventas, Cargar mercadería" para la tabla de usuarios; el dueño no lleva lista. */
export function resumenDePermisos(perfil: ConPermisos): string {
  if (perfil.rol === "duenio") return "Todo";

  const concedidos = PERMISOS.filter((permiso) => perfil.permisos.includes(permiso.id));
  if (concedidos.length === 0) return "Solo vender";
  if (concedidos.length === PERMISOS.length) return "Todo";
  return concedidos.map((permiso) => permiso.etiqueta).join(" · ");
}
