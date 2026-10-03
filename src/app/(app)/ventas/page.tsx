import { listarBaldes } from "@/lib/baldes";
import { turnoAbierto } from "@/lib/caja";
import { obtenerConfigComercio } from "@/lib/configComercio";
import { listarFormatos } from "@/lib/formatos";
import { listarPresentaciones } from "@/lib/presentaciones";
import { listarSabores } from "@/lib/sabores";
import { AvisoCajaCerrada } from "@/modulos/ventas/componentes/AvisoCajaCerrada";
import { FormularioTicket } from "@/modulos/ventas/componentes/FormularioTicket";
import { SeccionUltimasVentas } from "@/modulos/ventas/componentes/SeccionUltimasVentas";

export const metadata = { title: "Ventas" };

export default async function Ventas() {
  const [formatos, sabores, baldes, presentaciones, turno, config] = await Promise.all([
    listarFormatos(),
    listarSabores(),
    listarBaldes(),
    listarPresentaciones(),
    turnoAbierto(),
    obtenerConfigComercio(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold">Ventas</h1>
        <p className="text-texto-suave">Armá el ticket y cobrá.</p>
      </header>

      {!turno && <AvisoCajaCerrada />}

      <FormularioTicket
        formatos={formatos}
        sabores={sabores}
        baldes={baldes}
        presentaciones={presentaciones}
        precioBaldeDefault={config.precioBaldeDefault}
        cajaAbierta={turno !== null}
      />

      <SeccionUltimasVentas />
    </div>
  );
}
