import type { Presentacion } from "@/lib/presentaciones";
import type { Insumo } from "../tipos";
import { FilaProducto } from "./FilaProducto";

export function TablaProductos({
  productos,
  presentaciones,
  esDuenio,
}: {
  productos: Insumo[];
  presentaciones: Presentacion[];
  esDuenio: boolean;
}) {
  if (productos.length === 0) {
    return <p className="text-sm text-texto-suave">Ningún producto con ese nombre.</p>;
  }

  return (
    <table className="w-full text-left text-sm">
      <thead className="border-b border-linea font-mono text-xs text-texto-suave uppercase">
        <tr>
          <th className="p-2 font-normal">Producto</th>
          <th className="p-2 font-normal">En stock</th>
          <th className="p-2 font-normal">Costo por unidad</th>
          <th className="p-2 font-normal">Precio de venta</th>
          <th className="p-2 font-normal">Estado</th>
          <th className="p-2 font-normal" colSpan={2}></th>
        </tr>
      </thead>
      <tbody>
        {productos.map((producto) => (
          <FilaProducto
            key={producto.id}
            producto={producto}
            presentaciones={presentaciones.filter(
              (presentacion) => presentacion.insumoId === producto.id,
            )}
            esDuenio={esDuenio}
          />
        ))}
      </tbody>
    </table>
  );
}
