import { listarSabores } from "@/lib/sabores";
import { Tarjeta } from "@/componentes/Tarjeta";
import { listarVentasRecientes } from "../consultas/ventas";
import { FilaVentaReciente } from "./FilaVentaReciente";

export async function SeccionUltimasVentas() {
  const [ventas, sabores] = await Promise.all([listarVentasRecientes(), listarSabores()]);

  return (
    <Tarjeta>
      <header>
        <h2 className="font-display text-lg font-semibold">Últimas ventas</h2>
        <p className="text-sm text-texto-suave">
          Anular, o corregir un sabor si el cliente cambió de idea.
        </p>
      </header>

      {ventas.length === 0 ? (
        <p className="text-sm text-texto-suave">Todavía no se registró ninguna venta.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {ventas.map((venta) => (
            <FilaVentaReciente key={venta.id} venta={venta} sabores={sabores} />
          ))}
        </div>
      )}
    </Tarjeta>
  );
}
