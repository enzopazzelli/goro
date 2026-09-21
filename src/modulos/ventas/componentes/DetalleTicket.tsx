import type { ReactNode } from "react";
import { ETIQUETA_MEDIO_PAGO, type MedioPago } from "../tipos";

export type ItemParaDetalle = {
  key: string | number;
  formatoNombre: string;
  precio: number;
  sabores: ReactNode;
};

export function DetalleTicket({
  items,
  medioPago,
  total,
}: {
  items: ItemParaDetalle[];
  medioPago: MedioPago;
  total: number;
}) {
  return (
    <div className="flex flex-col gap-2 font-mono text-sm">
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li
            key={item.key}
            className="flex flex-col gap-1 border-b border-dashed border-linea pb-2 last:border-0 last:pb-0"
          >
            <div className="flex justify-between gap-2">
              <span className="font-semibold">{item.formatoNombre}</span>
              <span className="numero">${item.precio}</span>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-texto-suave">{item.sabores}</div>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between border-t-2 border-marco pt-2">
        <span className="text-xs tracking-wide text-texto-suave uppercase">
          {ETIQUETA_MEDIO_PAGO[medioPago]}
        </span>
        <span className="numero text-xl font-semibold">${total}</span>
      </div>
    </div>
  );
}
