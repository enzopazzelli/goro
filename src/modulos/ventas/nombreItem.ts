import { etiquetaPresentacion } from "@/lib/etiquetaPresentacion";

export type FilaNombreItem = {
  formatos: { nombre: string } | null;
  presentaciones_insumo: {
    nombre: string;
    unidades: number;
    insumos: { nombre: string } | null;
  } | null;
};

/** "Cucurucho doble" para un formato, "Bombón · Docena ×12" para un producto: el mismo nombre que ve el cajero en el carrito. */
export function nombreDeItem(fila: FilaNombreItem): string {
  if (fila.formatos) return fila.formatos.nombre;

  const presentacion = fila.presentaciones_insumo;
  if (!presentacion) return "";

  const etiqueta = etiquetaPresentacion(presentacion.nombre, presentacion.unidades);
  return presentacion.insumos ? `${presentacion.insumos.nombre} · ${etiqueta}` : etiqueta;
}
