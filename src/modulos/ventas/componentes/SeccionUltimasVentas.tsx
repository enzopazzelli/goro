import Link from "next/link";
import { clasesDeBoton } from "@/componentes/Boton";
import { Tarjeta } from "@/componentes/Tarjeta";
import { listarSabores } from "@/lib/sabores";
import { listarVentas } from "../consultas/ventas";
import { FilaVenta } from "./FilaVenta";

/**
 * Las últimas cinco y nada más: en el mostrador esto es el atajo para anular o
 * corregir lo que recién se cobró. Buscar una venta de ayer es otra tarea, y
 * tiene su pantalla.
 */
export async function SeccionUltimasVentas() {
  const [{ ventas }, sabores] = await Promise.all([listarVentas({ limite: 5 }), listarSabores()]);

  return (
    <Tarjeta>
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-semibold">Últimas ventas</h2>
          <p className="text-sm text-texto-suave">
            Anular, o corregir un sabor si el cliente cambió de idea.
          </p>
        </div>
        <Link href="/historial" className={clasesDeBoton("suave", "chico")}>
          Ver el historial →
        </Link>
      </header>

      {ventas.length === 0 ? (
        <p className="text-sm text-texto-suave">Todavía no se registró ninguna venta.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {ventas.map((venta) => (
            <FilaVenta key={venta.id} venta={venta} sabores={sabores} />
          ))}
        </div>
      )}
    </Tarjeta>
  );
}
