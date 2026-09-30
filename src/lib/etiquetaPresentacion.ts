/** Un nombre como "Decena x10" o "Caja ×24" ya dice cuántas unidades descuenta. */
const CANTIDAD_EN_EL_NOMBRE = /[x×]\s*(\d+)/i;

/**
 * "Docena ×12": siempre se ve cuántas unidades descuenta del stock, sin abrir un
 * casillero. Si el nombre ya lo dice y coincide con la cantidad real, no se repite
 * ("Decena x10", no "Decena x10 ×10"); si dice otra, se agrega la real para no engañar.
 */
export function etiquetaPresentacion(nombre: string, unidades: number): string {
  const limpio = nombre.trim();
  const dicha = CANTIDAD_EN_EL_NOMBRE.exec(limpio);
  return dicha && Number(dicha[1]) === unidades ? limpio : `${limpio} ×${unidades}`;
}

/** El precio tal como se lee en una tabla: "sin precio" no es lo mismo que $0 a la venta. */
export function textoPrecio(presentacion: { activo: boolean; precio: number }): string {
  if (presentacion.precio === 0) return "sin precio";
  return presentacion.activo ? `$${presentacion.precio}` : `$${presentacion.precio} (no se vende)`;
}
