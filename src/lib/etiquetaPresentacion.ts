/** "Docena ×12": siempre se ve cuántas unidades descuenta del stock, sin abrir un casillero. */
export function etiquetaPresentacion(nombre: string, unidades: number): string {
  return `${nombre.trim()} ×${unidades}`;
}

/** El precio tal como se lee en una tabla: "sin precio" no es lo mismo que $0 a la venta. */
export function textoPrecio(presentacion: { activo: boolean; precio: number }): string {
  if (presentacion.precio === 0) return "sin precio";
  return presentacion.activo ? `$${presentacion.precio}` : `$${presentacion.precio} (no se vende)`;
}
