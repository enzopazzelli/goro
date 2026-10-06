"use client";

import { ArcoCab } from "@/componentes/ArcoCab";
import { Boton } from "@/componentes/Boton";
import { BotonAbrirCaja } from "@/componentes/ModalAbrirCaja";
import { formatearMiles } from "@/lib/plata";
import type { Sabor } from "@/lib/sabores";
import type { EstadoTicket } from "../consultas/acciones";
import { totalDelCarrito } from "../ticket";
import type { Cobrado, ItemEnCarrito, MedioPago } from "../tipos";
import { AvisoCobrado } from "./AvisoCobrado";
import { BotonAbrirBaldeFaltante } from "./BotonAbrirBaldeFaltante";
import { LineasDeCarrito } from "./LineasDeCarrito";

export function CarritoTicket({
  carrito,
  sabores,
  medioPago,
  onCambiarMedioPago,
  clave,
  onQuitar,
  accion,
  estado,
  enviando,
  cajaAbierta,
  cobrado,
}: {
  carrito: ItemEnCarrito[];
  sabores: Sabor[];
  medioPago: MedioPago;
  onCambiarMedioPago: (medio: MedioPago) => void;
  /** Identifica a este ticket ante la base: ver `FormularioTicket`. */
  clave: string;
  onQuitar: (indice: number) => void;
  accion: (datos: FormData) => void;
  estado: EstadoTicket;
  enviando: boolean;
  cajaAbierta: boolean;
  /** El aviso de la venta anterior, ya decidido afuera: el carrito solo lo dibuja. */
  cobrado: Cobrado | null;
}) {
  const total = totalDelCarrito(carrito);
  // El error de "caja cerrada" queda en el estado hasta el próximo cobro; si
  // mientras tanto la abrieron, ya no tiene nada que decir.
  const errorVigente = estado.error && !(estado.cajaCerrada && cajaAbierta);

  return (
    <div className="flex flex-col lg:sticky lg:top-4 lg:self-start">
      <ArcoCab
        eyebrow="Pedido"
        titulo={`${carrito.length} ítem${carrito.length === 1 ? "" : "s"}`}
      />
      <div className="flex flex-col gap-3 rounded-b-(--r-grande) border border-t-0 border-linea bg-superficie p-4 shadow-(--shadow-tarjeta)">
        <AvisoCobrado cobrado={cobrado} />

        {carrito.length === 0 ? (
          <p className="text-sm text-texto-suave">
            Elegí un formato (y sus sabores) o un producto.
          </p>
        ) : (
          <LineasDeCarrito carrito={carrito} sabores={sabores} onQuitar={onQuitar} />
        )}

        <div className="border-t-2 border-marco pt-3">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-sm tracking-wide text-texto-suave uppercase">
              Total
            </span>
            <span className="numero text-4xl font-medium">
              <span className="text-base opacity-55">$</span>
              {formatearMiles(total)}
            </span>
          </div>

          <form action={accion} className="mt-3 flex flex-col gap-2">
            <input type="hidden" name="items" value={JSON.stringify(carrito)} />
            <input type="hidden" name="clave" value={clave} />
            <select
              name="medioPago"
              value={medioPago}
              onChange={(evento) => onCambiarMedioPago(evento.target.value as MedioPago)}
              className="rounded-(--r) border border-linea bg-superficie px-3 py-2.5 text-base"
            >
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
            </select>
            <Boton
              type="submit"
              tamano="grande"
              disabled={enviando || carrito.length === 0 || !cajaAbierta}
            >
              {enviando ? "Cobrando…" : "Cobrar"}
            </Boton>
          </form>

          {errorVigente && (
            <div role="alert" className="mt-2 flex flex-col items-start gap-2 text-sm text-alerta">
              <p>{estado.error}</p>
              {estado.cajaCerrada && <BotonAbrirCaja variante="suave" />}
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
