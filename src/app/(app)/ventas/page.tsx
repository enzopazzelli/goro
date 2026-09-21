import { listarFormatos } from "@/lib/formatos";
import { listarSabores } from "@/lib/sabores";
import { FormularioTicket } from "@/modulos/ventas/componentes/FormularioTicket";
import { SeccionUltimasVentas } from "@/modulos/ventas/componentes/SeccionUltimasVentas";

export const metadata = { title: "Ventas" };

export default async function Ventas() {
  const [formatos, sabores] = await Promise.all([listarFormatos(), listarSabores()]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold">Ventas</h1>
        <p className="text-texto-suave">Armá el ticket y cobrá.</p>
      </header>

      <section className="flex flex-col gap-4 rounded-(--r-grande) border border-linea bg-superficie p-6">
        <header>
          <h2 className="font-display text-lg font-semibold">Nueva venta</h2>
        </header>
        <FormularioTicket formatos={formatos} sabores={sabores} />
      </section>

      <SeccionUltimasVentas />
    </div>
  );
}
