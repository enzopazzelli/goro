export type DatosPresentacion = {
  nombre: string;
  unidades: number;
  precio: number;
  activo: boolean;
};

/** La misma regla que los checks de la columna; acá solo para dar un mensaje legible antes de ir a la base. */
export function validarPresentacion(datos: DatosPresentacion): string | null {
  if (!datos.nombre) return "Escribí un nombre (por ejemplo, Docena).";
  if (!Number.isInteger(datos.unidades) || datos.unidades <= 0) {
    return "Las unidades tienen que ser un número entero mayor a cero.";
  }
  if (!Number.isInteger(datos.precio) || datos.precio < 0) {
    return "El precio tiene que ser un número entero, sin negativos.";
  }
  if (datos.activo && datos.precio === 0)
    return "Para activarla hace falta un precio mayor a cero.";
  return null;
}

export type DatosProducto = {
  nombre: string;
  costo: number;
  cantidadInicial: number;
};

/** Un producto de freezer se cuenta en unidades enteras: no hay "2,5 bombones". */
export function validarProducto(datos: DatosProducto): string | null {
  if (!datos.nombre) return "Escribí un nombre (por ejemplo, Bombón).";
  if (!Number.isInteger(datos.costo) || datos.costo < 0) {
    return "El costo por unidad tiene que ser un número entero, sin negativos.";
  }
  if (!Number.isInteger(datos.cantidadInicial) || datos.cantidadInicial < 0) {
    return "El stock inicial tiene que ser un número entero, sin negativos.";
  }
  return null;
}
