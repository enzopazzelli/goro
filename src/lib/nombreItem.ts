import { etiquetaPresentacion } from "@/lib/etiquetaPresentacion";

export type FilaNombreItem = {
  formatos: { nombre: string } | null;
  /** El sabor del balde que se vendió entero. */
  baldes?: { sabores: { nombre: string } | null } | null;
  presentaciones_insumo: {
    nombre: string;
    unidades: number;
    insumos: { nombre: string } | null;
  } | null;
};

/** "Cucurucho doble" para un formato, "Bombón · Docena ×12" para un producto, "Balde entero · Frutilla" para un balde: el mismo nombre que ve el cajero en el carrito. */
export function nombreDeItem(fila: FilaNombreItem): string {
  if (fila.formatos) return fila.formatos.nombre;
  if (fila.baldes) return `Balde entero · ${fila.baldes.sabores?.nombre ?? ""}`;

  const presentacion = fila.presentaciones_insumo;
  if (!presentacion) return "";

  const etiqueta = etiquetaPresentacion(presentacion.nombre, presentacion.unidades);
  return presentacion.insumos ? `${presentacion.insumos.nombre} · ${etiqueta}` : etiqueta;
}
