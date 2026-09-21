"use client";

import { useActionState, useState } from "react";
import { Boton } from "@/componentes/Boton";
import type { Formato } from "@/lib/formatos";
import type { Sabor } from "@/lib/sabores";
import type { ItemDeTicket, ItemEnCarrito, MedioPago } from "../tipos";
import { registrarVenta } from "../consultas/acciones";
import { BotonAbrirBaldeFaltante } from "./BotonAbrirBaldeFaltante";
import { SelectorFormatoYSabores } from "./SelectorFormatoYSabores";

const INICIAL = { error: null, faltaBalde: null };

export function FormularioTicket({ formatos, sabores }: { formatos: Formato[]; sabores: Sabor[] }) {
  const [carrito, setCarrito] = useState<ItemEnCarrito[]>([]);
  const [medioPago, setMedioPago] = useState<MedioPago>("efectivo");
  const [estado, accion, enviando] = useActionState(registrarVenta, INICIAL);

  const total = carrito.reduce((suma, item) => suma + item.precio, 0);
  const itemsParaEnviar: ItemDeTicket[] = carrito.map((item) => ({
    formatoId: item.formatoId,
    saborIds: item.saborIds,
  }));

  function quitar(indice: number) {
    setCarrito((actuales) => actuales.filter((_, i) => i !== indice));
  }

  return (
    <div className="flex flex-col gap-4">
      <SelectorFormatoYSabores
        formatos={formatos.filter((formato) => formato.activo)}
        sabores={sabores}
        onAgregar={(item) => setCarrito((actuales) => [...actuales, item])}
      />

      {carrito.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm">
          {carrito.map((item, indice) => (
            <li key={indice} className="flex items-center gap-3">
              <span>{item.formatoNombre}</span>
              <span className="text-texto-suave">{item.saboresNombres.join(", ")}</span>
              <span className="numero">${item.precio}</span>
              <button
                type="button"
                onClick={() => quitar(indice)}
                className="text-xs underline opacity-70"
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}

      <form action={accion} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="items" value={JSON.stringify(itemsParaEnviar)} />
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold tracking-wide text-texto-suave uppercase">
            Medio de pago
          </span>
          <select
            name="medioPago"
            value={medioPago}
            onChange={(evento) => setMedioPago(evento.target.value as MedioPago)}
            className="rounded-(--r) border border-linea bg-superficie px-3 py-2 text-sm"
          >
            <option value="efectivo">Efectivo</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="transferencia">Transferencia</option>
          </select>
        </label>

        <span className="numero text-lg font-semibold">Total: ${total}</span>

        <Boton type="submit" disabled={enviando || carrito.length === 0}>
          {enviando ? "Cobrando…" : "Cobrar"}
        </Boton>
      </form>

      {estado.error && (
        <div role="alert" className="flex flex-col gap-2 text-sm text-alerta">
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
  );
}
