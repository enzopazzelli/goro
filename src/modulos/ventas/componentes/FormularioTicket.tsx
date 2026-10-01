"use client";

import { useActionState, useState } from "react";
import type { Balde } from "@/lib/baldes";
import type { Formato } from "@/lib/formatos";
import type { Presentacion } from "@/lib/presentaciones";
import type { Sabor } from "@/lib/sabores";
import { cobradoDe, type Cobrado } from "../ticket";
import type { ItemEnCarrito, MedioPago } from "../tipos";
import { registrarVenta, type EstadoTicket } from "../consultas/acciones";
import { CarritoTicket } from "./CarritoTicket";
import { SelectorDeProductos } from "./SelectorDeProductos";
import { SelectorFormatoYSabores } from "./SelectorFormatoYSabores";

const INICIAL: EstadoTicket = { error: null, faltaBalde: null };

export function FormularioTicket({
  formatos,
  sabores,
  baldes,
  presentaciones,
  cajaAbierta,
}: {
  formatos: Formato[];
  sabores: Sabor[];
  baldes: Balde[];
  presentaciones: Presentacion[];
  cajaAbierta: boolean;
}) {
  const [carrito, setCarrito] = useState<ItemEnCarrito[]>([]);
  const [medioPago, setMedioPago] = useState<MedioPago>("efectivo");
  const [cobrado, setCobrado] = useState<Cobrado | null>(null);

  // Al cobrar, el carrito queda vacío solo, listo para el próximo cliente: no
  // hay un paso intermedio que cerrar a mano. Se vacía al TERMINAR la acción y
  // no comparando estados durante el render: la acción devuelve siempre el
  // mismo objeto de éxito, así que la segunda venta no se vería como un cambio
  // (ver ModalCargarInsumo).
  const [estado, accion, enviando] = useActionState(
    async (previo: EstadoTicket, datos: FormData) => {
      const resultado = await registrarVenta(previo, datos);
      if (!resultado.error) {
        setCobrado(cobradoDe(datos));
        setCarrito([]);
      }
      return resultado;
    },
    INICIAL,
  );

  function agregar(item: ItemEnCarrito) {
    // El aviso de la venta anterior ya cumplió: empezó la siguiente.
    setCobrado(null);
    setCarrito((actuales) => [...actuales, item]);
  }

  function quitar(indice: number) {
    setCarrito((actuales) => actuales.filter((_, i) => i !== indice));
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-4">
        <SelectorFormatoYSabores
          formatos={formatos.filter((formato) => formato.activo)}
          sabores={sabores}
          baldes={baldes}
          onAgregar={agregar}
        />
        <SelectorDeProductos
          presentaciones={presentaciones.filter(
            (presentacion) => presentacion.activo && presentacion.insumoActivo,
          )}
          onAgregar={agregar}
        />
      </div>

      <CarritoTicket
        carrito={carrito}
        sabores={sabores}
        medioPago={medioPago}
        onCambiarMedioPago={setMedioPago}
        onQuitar={quitar}
        accion={accion}
        estado={estado}
        enviando={enviando}
        cajaAbierta={cajaAbierta}
        cobrado={cobrado}
      />
    </div>
  );
}
