"use client";

import { ArcoCab } from "@/componentes/ArcoCab";
import { Boton } from "@/componentes/Boton";
import type { Sabor } from "@/lib/sabores";
import type { EstadoTicket } from "../consultas/acciones";
import type { ItemDeTicket, ItemEnCarrito, MedioPago } from "../tipos";
import { BotonAbrirBaldeFaltante } from "./BotonAbrirBaldeFaltante";
import { LineasDeCarrito } from "./LineasDeCarrito";

export function CarritoTicket({
  carrito,
  sabores,
  medioPago,
  onCambiarMedioPago,
  onQuitar,
  accion,
  estado,
  enviando,
}: {
  carrito: ItemEnCarrito[];
  sabores: Sabor[];
  medioPago: MedioPago;
  onCambiarMedioPago: (medio: MedioPago) => void;
  onQuitar: (indice: number) => void;
  accion: (datos: FormData) => void;
  estado: EstadoTicket;
  enviando: boolean;
}) {
  const total = carrito.reduce((suma, item) => suma + item.precio, 0);
  const itemsParaEnviar: ItemDeTicket[] = carrito.map((item) => ({
    formatoId: item.formatoId,
    saborIds: item.saborIds,
  }));

  return (
    <div className="flex flex-col lg:sticky lg:top-4 lg:self-start">
      <ArcoCab
        eyebrow="Pedido"
        titulo={`${carrito.length} ítem${carrito.length === 1 ? "" : "s"}`}
      />
      <div className="flex flex-col gap-3 rounded-b-(--r-grande) border border-t-0 border-linea bg-superficie p-4 shadow-(--shadow-tarjeta)">
        {carrito.length === 0 ? (
          <p className="text-sm text-texto-suave">Elegí un formato y después los sabores.</p>
        ) : (
          <LineasDeCarrito carrito={carrito} sabores={sabores} onQuitar={onQuitar} />
        )}

        <div className="border-t-2 border-marco pt-3">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-xs tracking-wide text-texto-suave uppercase">
              Total
            </span>
            <span className="numero text-4xl font-medium">
              <span className="text-base opacity-55">$</span>
              {total}
            </span>
          </div>

          <form action={accion} className="mt-3 flex flex-col gap-2">
            <input type="hidden" name="items" value={JSON.stringify(itemsParaEnviar)} />
            <select
              name="medioPago"
              value={medioPago}
              onChange={(evento) => onCambiarMedioPago(evento.target.value as MedioPago)}
              className="rounded-(--r) border border-linea bg-superficie px-3 py-2 text-sm"
            >
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
            </select>
            <Boton type="submit" tamano="grande" disabled={enviando || carrito.length === 0}>
              {enviando ? "Cobrando…" : "Cobrar"}
            </Boton>
          </form>

          {estado.error && (
            <div role="alert" className="mt-2 flex flex-col gap-2 text-sm text-alerta">
              <p>{estado.error}</p>
              {estado.faltaBalde?.baldeParaAbrir && (
                <BotonAbrirBaldeFaltante
                  baldeId={estado.faltaBalde.baldeParaAbrir}
                  saborNombre={estado.faltaBalde.saborNombre}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
