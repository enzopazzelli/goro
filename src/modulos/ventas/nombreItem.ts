export type FilaNombreItem = {
  formatos: { nombre: string } | null;
  presentaciones_insumo: { nombre: string; insumos: { nombre: string } | null } | null;
};

/** "Cucurucho doble" para un formato, "Bombón · Docena" para un producto: mismo nombre que ve el cajero en el carrito. */
export function nombreDeItem(fila: FilaNombreItem): string {
  if (fila.formatos) return fila.formatos.nombre;

  const presentacion = fila.presentaciones_insumo;
  if (!presentacion) return "";
  return presentacion.insumos
    ? `${presentacion.insumos.nombre} · ${presentacion.nombre}`
    : presentacion.nombre;
}
