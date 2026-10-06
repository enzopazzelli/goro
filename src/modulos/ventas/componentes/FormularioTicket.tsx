"use client";

import { useActionState, useState } from "react";
import type { Balde } from "@/lib/baldes";
import { nuevaClave } from "@/lib/claveUnica";
import type { Formato } from "@/lib/formatos";
import type { Presentacion } from "@/lib/presentaciones";
import type { Sabor } from "@/lib/sabores";
import type { Cobrado, ItemEnCarrito, MedioPago } from "../tipos";
import { registrarVenta, type EstadoTicket } from "../consultas/acciones";
import { mismoObjeto } from "../ticket";
import { CampoDeCodigo } from "./CampoDeCodigo";
import { CarritoTicket } from "./CarritoTicket";
import { SelectorDeBaldes } from "./SelectorDeBaldes";
import { SelectorDeProductos } from "./SelectorDeProductos";
import { SelectorFormatoYSabores } from "./SelectorFormatoYSabores";

const INICIAL: EstadoTicket = { error: null, faltaBalde: null };

export function FormularioTicket({
  formatos,
  sabores,
  baldes,
  presentaciones,
  precioBaldeDefault,
  cajaAbierta,
}: {
  formatos: Formato[];
  sabores: Sabor[];
  baldes: Balde[];
  presentaciones: Presentacion[];
  /** El precio del balde entero que vale para los sabores que no tienen uno propio. */
  precioBaldeDefault: number | null;
  cajaAbierta: boolean;
}) {
  const [carrito, setCarrito] = useState<ItemEnCarrito[]>([]);
  const [medioPago, setMedioPago] = useState<MedioPago>("efectivo");
  // Identifica a este ticket ante la base: si el cobro se manda dos veces (doble
  // clic, reintento tras perder la respuesta), la base devuelve la venta que ya
  // entró en vez de cobrar otra. Cambia con CUALQUIER cambio del carrito o del
  // medio de pago, así que la misma clave siempre es el mismo ticket. Se genera
  // en un evento y no al renderizar: el servidor y el navegador no coincidirían.
  const [clave, setClave] = useState("");

  function cambiarCarrito(cambio: (actuales: ItemEnCarrito[]) => ItemEnCarrito[]) {
    setCarrito(cambio);
    setClave(nuevaClave());
  }

  function cambiarMedioPago(medio: MedioPago) {
    setMedioPago(medio);
    setClave(nuevaClave());
  }
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
      // carrito queda como está con la MISMA clave: volver a tocar Cobrar es
      // seguro, porque si ya había entrado la base la devuelve sin cobrar otra.
      return {
        error:
          "No llegó la respuesta. Tocá Cobrar de nuevo: si la venta ya había entrado, no se cobra dos veces.",
      };
    }

    if (!resultado.error) {
      setCobrado(resultado.cobrado ?? null);
      setCarrito([]);
      setClave("");
    }
    return resultado;
  }

  const [estado, accion, enviando] = useActionState(cobrar, INICIAL);

  function quitar(indice: number) {
    cambiarCarrito((actuales) => actuales.filter((_, i) => i !== indice));
  }

  const productosALaVenta = presentaciones.filter(
    (presentacion) => presentacion.activo && presentacion.insumoActivo,
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      {/* Mientras la venta viaja no se agrega nada: el carrito se vacía cuando
          vuelve, y lo que se hubiera agregado en el medio se perdería sin que
          quien cobra sepa si entró o no. */}
      <fieldset disabled={enviando} className="flex min-w-0 flex-col gap-4">
        <CampoDeCodigo
          presentaciones={productosALaVenta}
          yaEnElTicket={(item) => carrito.some((actual) => mismoObjeto(actual, item))}
          onAgregar={(item) => cambiarCarrito((actuales) => [...actuales, item])}
        />
        <SelectorFormatoYSabores
          formatos={formatos.filter((formato) => formato.activo)}
          sabores={sabores}
          baldes={baldes}
          onAgregar={(item) => cambiarCarrito((actuales) => [...actuales, item])}
        />
        <SelectorDeBaldes
          sabores={sabores}
          baldes={baldes}
          precioPorDefecto={precioBaldeDefault}
          onAgregar={(item) => cambiarCarrito((actuales) => [...actuales, item])}
        />
        <SelectorDeProductos
          presentaciones={productosALaVenta}
          onAgregar={(item) => cambiarCarrito((actuales) => [...actuales, item])}
        />
      </fieldset>

      <CarritoTicket
        carrito={carrito}
        sabores={sabores}
        medioPago={medioPago}
        onCambiarMedioPago={cambiarMedioPago}
        clave={clave}
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
