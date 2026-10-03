import { etiquetaPresentacion } from "@/lib/etiquetaPresentacion";

export type FilaNombreItem = {
  formatos: { nombre: string } | null;
  /** El sabor del balde que se vendió entero. */
  baldes?: { sabores: { nombre: string } | null } | null;
  /** El pote armado que se vendió: su formato y el sabor de su balde. */
  potes?: {
    formatos: { nombre: string } | null;
    baldes: { sabores: { nombre: string } | null } | null;
  } | null;
  presentaciones_insumo: {
    nombre: string;
    unidades: number;
    insumos: { nombre: string } | null;
  } | null;
};

type Presentacion = NonNullable<FilaNombreItem["presentaciones_insumo"]>;

function nombreDePresentacion(presentacion: Presentacion): string {
  const etiqueta = etiquetaPresentacion(presentacion.nombre, presentacion.unidades);
  return presentacion.insumos ? `${presentacion.insumos.nombre} · ${etiqueta}` : etiqueta;
}

function nombreDePote(pote: NonNullable<FilaNombreItem["potes"]>): string {
  return `Pote ${pote.formatos?.nombre ?? ""} · ${pote.baldes?.sabores?.nombre ?? ""}`;
}

/**
 * "Cucurucho doble" para un formato, "Bombón · Docena ×12" para un producto,
 * "Balde entero · Frutilla" para un balde, "Pote 1/2 kg · Frutilla" para un
 * pote: el mismo nombre que ve el cajero en el carrito.
 */
export function nombreDeItem(fila: FilaNombreItem): string {
  if (fila.formatos) return fila.formatos.nombre;
  if (fila.potes) return nombreDePote(fila.potes);
  if (fila.baldes) return `Balde entero · ${fila.baldes.sabores?.nombre ?? ""}`;
  return fila.presentaciones_insumo ? nombreDePresentacion(fila.presentaciones_insumo) : "";
}
