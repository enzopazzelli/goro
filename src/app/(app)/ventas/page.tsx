import { listarBaldes } from "@/lib/baldes";
import { listarFormatos } from "@/lib/formatos";
import { listarSabores } from "@/lib/sabores";
import { FormularioTicket } from "@/modulos/ventas/componentes/FormularioTicket";
import { SeccionUltimasVentas } from "@/modulos/ventas/componentes/SeccionUltimasVentas";

export const metadata = { title: "Ventas" };

export default async function Ventas() {
  const [formatos, sabores, baldes] = await Promise.all([
    listarFormatos(),
    listarSabores(),
    listarBaldes(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold">Ventas</h1>
        <p className="text-texto-suave">Armá el ticket y cobrá.</p>
      </header>

      <FormularioTicket formatos={formatos} sabores={sabores} baldes={baldes} />

      <SeccionUltimasVentas />
    </div>
  );
}
