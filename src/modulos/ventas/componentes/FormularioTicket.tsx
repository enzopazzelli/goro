"use client";

import { useActionState, useState } from "react";
import type { Balde } from "@/lib/baldes";
import type { Formato } from "@/lib/formatos";
import type { Sabor } from "@/lib/sabores";
import type { ItemEnCarrito, MedioPago } from "../tipos";
import { registrarVenta } from "../consultas/acciones";
import { CarritoTicket } from "./CarritoTicket";
import { SelectorFormatoYSabores } from "./SelectorFormatoYSabores";
import { TicketConfirmado } from "./TicketConfirmado";

const INICIAL = { error: null, faltaBalde: null };

type Confirmado = { items: ItemEnCarrito[]; medioPago: MedioPago; total: number };

export function FormularioTicket({
  formatos,
  sabores,
  baldes,
}: {
  formatos: Formato[];
  sabores: Sabor[];
  baldes: Balde[];
}) {
  const [carrito, setCarrito] = useState<ItemEnCarrito[]>([]);
  const [medioPago, setMedioPago] = useState<MedioPago>("efectivo");
  const [confirmado, setConfirmado] = useState<Confirmado | null>(null);
  const [estado, accion, enviando] = useActionState(registrarVenta, INICIAL);

  // "Ajustar estado cuando cambia un valor" durante el render, no en un
  // efecto (la guía de React lo pide así: llamar setState acá adentro es
  // válido porque React vuelve a renderizar antes de pintar nada, y el
  // segundo render ya no vuelve a entrar porque estadoPrevio quedó al día).
  const [estadoPrevio, setEstadoPrevio] = useState(estado);
  if (estado !== estadoPrevio) {
    setEstadoPrevio(estado);
    if (!estado.error && carrito.length > 0) {
      const total = carrito.reduce((suma, item) => suma + item.precio, 0);
      setConfirmado({ items: carrito, medioPago, total });
      setCarrito([]);
    }
  }

  function quitar(indice: number) {
    setCarrito((actuales) => actuales.filter((_, i) => i !== indice));
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <SelectorFormatoYSabores
        formatos={formatos.filter((formato) => formato.activo)}
        sabores={sabores}
        baldes={baldes}
        onAgregar={(item) => setCarrito((actuales) => [...actuales, item])}
      />

      {confirmado ? (
        <TicketConfirmado
          items={confirmado.items}
          sabores={sabores}
          medioPago={confirmado.medioPago}
          total={confirmado.total}
          onNuevaVenta={() => setConfirmado(null)}
        />
      ) : (
        <CarritoTicket
          carrito={carrito}
          sabores={sabores}
          medioPago={medioPago}
          onCambiarMedioPago={setMedioPago}
          onQuitar={quitar}
          accion={accion}
          estado={estado}
          enviando={enviando}
        />
      )}
    </div>
  );
}
