import type { ArticuloDescartable } from "../tipos";

const GRUPOS = [
  { tipo: "producto", titulo: "Productos" },
  { tipo: "insumo", titulo: "Insumos" },
  { tipo: "envase", titulo: "Envases" },
] as const;

/** La lista para cuando no hay código a mano. Cada artículo dice cuánto hay: no se tira más que eso. */
export function SelectorDeArticulo({
  articulos,
  className,
}: {
  articulos: ArticuloDescartable[];
  className: string;
}) {
  return (
    <select name="insumoId" defaultValue="" className={className}>
      <option value="">—</option>
      {GRUPOS.map((grupo) => (
        <optgroup key={grupo.tipo} label={grupo.titulo}>
          {articulos
            .filter((articulo) => articulo.tipo === grupo.tipo)
            .map((articulo) => (
              <option key={articulo.id} value={articulo.id}>
                {articulo.nombre} (hay {articulo.cantidad} {articulo.unidad})
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  );
}
