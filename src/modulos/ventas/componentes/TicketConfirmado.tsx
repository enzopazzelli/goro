import { ArcoCab } from "@/componentes/ArcoCab";
import { Boton } from "@/componentes/Boton";
import { Punto } from "@/componentes/Punto";
import type { Sabor } from "@/lib/sabores";
import type { ItemEnCarrito, MedioPago } from "../tipos";
import { DetalleTicket, type ItemParaDetalle } from "./DetalleTicket";

export function TicketConfirmado({
  items,
  sabores,
  medioPago,
  total,
  onNuevaVenta,
}: {
  items: ItemEnCarrito[];
  sabores: Sabor[];
  medioPago: MedioPago;
  total: number;
  onNuevaVenta: () => void;
}) {
  const itemsParaDetalle: ItemParaDetalle[] = items.map((item, indice) => ({
    key: indice,
    formatoNombre: item.formatoNombre,
    precio: item.precio,
    sabores: item.saborIds.map((saborId) => {
      const sabor = sabores.find((s) => s.id === saborId);
      return (
        <span key={saborId} className="flex items-center gap-1">
          <Punto color={sabor?.color ?? "var(--texto-suave)"} /> {sabor?.nombre ?? ""}
        </span>
      );
    }),
  }));

  return (
    <div className="flex flex-col">
      <ArcoCab eyebrow="Cobrado" titulo="¡Listo!" />
      <div className="flex flex-col gap-3 rounded-b-(--r-grande) border border-t-0 border-linea bg-superficie p-4 shadow-(--shadow-tarjeta)">
        <DetalleTicket items={itemsParaDetalle} medioPago={medioPago} total={total} />
        <Boton type="button" tamano="grande" onClick={onNuevaVenta}>
          Nueva venta
        </Boton>
      </div>
    </div>
  );
}
