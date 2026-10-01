"use client";

import { useActionState, useState } from "react";
import type { Balde } from "@/lib/baldes";
import type { Formato } from "@/lib/formatos";
import type { Presentacion } from "@/lib/presentaciones";
import type { Sabor } from "@/lib/sabores";
import type { Cobrado, ItemEnCarrito, MedioPago } from "../tipos";
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
  // El aviso de lo cobrado se muestra mientras el carrito esté vacío: al
  // agregar el primer ítem de la venta siguiente se va solo, y si ese ítem se
  // quitó por error, vuelve. Derivarlo del carrito evita tener que apagarlo a
  // mano en cada lugar donde el carrito cambia.
  const [cobrado, setCobrado] = useState<Cobrado | null>(null);

  // Al cobrar, el carrito queda vacío solo, listo para el próximo cliente: no
  // hay un paso intermedio que cerrar a mano. Se vacía al TERMINAR la acción y
  // no comparando el estado anterior con el nuevo durante el render, que es de
  // donde salía el bug de ModalCargarInsumo: dos resultados iguales le parecen
  // el mismo al render.
  async function cobrar(previo: EstadoTicket, datos: FormData): Promise<EstadoTicket> {
    let resultado: EstadoTicket;
    try {
      resultado = await registrarVenta(previo, datos);
    } catch {
      // Si se perdió la respuesta, la venta pudo haber entrado igual. El
      // carrito queda como está, pero mandando a mirar antes de cobrar de
      // nuevo: cobrar dos veces es peor que cobrar una vez de más a mano.
      return {
        error: "No sabemos si la venta entró: mirá Últimas ventas antes de cobrar de nuevo.",
      };
    }

    if (!resultado.error) {
      setCobrado(resultado.cobrado ?? null);
      setCarrito([]);
    }
    return resultado;
  }

  const [estado, accion, enviando] = useActionState(cobrar, INICIAL);

  function quitar(indice: number) {
    setCarrito((actuales) => actuales.filter((_, i) => i !== indice));
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      {/* Mientras la venta viaja no se agrega nada: el carrito se vacía cuando
          vuelve, y lo que se hubiera agregado en el medio se perdería sin que
          quien cobra sepa si entró o no. */}
      <fieldset disabled={enviando} className="flex min-w-0 flex-col gap-4">
        <SelectorFormatoYSabores
          formatos={formatos.filter((formato) => formato.activo)}
          sabores={sabores}
          baldes={baldes}
          onAgregar={(item) => setCarrito((actuales) => [...actuales, item])}
        />
        <SelectorDeProductos
          presentaciones={presentaciones.filter(
            (presentacion) => presentacion.activo && presentacion.insumoActivo,
          )}
          onAgregar={(item) => setCarrito((actuales) => [...actuales, item])}
        />
      </fieldset>

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
        cobrado={carrito.length === 0 ? cobrado : null}
      />
    </div>
  );
}
