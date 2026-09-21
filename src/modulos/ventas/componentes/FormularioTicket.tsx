"use client";

import { useActionState, useState } from "react";
import type { Balde } from "@/lib/baldes";
import type { Formato } from "@/lib/formatos";
import type { Sabor } from "@/lib/sabores";
import type { ItemEnCarrito, MedioPago } from "../tipos";
import { registrarVenta } from "../consultas/acciones";
import { CarritoTicket } from "./CarritoTicket";
import { SelectorFormatoYSabores } from "./SelectorFormatoYSabores";

const INICIAL = { error: null, faltaBalde: null };

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
  const [estado, accion, enviando] = useActionState(registrarVenta, INICIAL);

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
    </div>
  );
}
