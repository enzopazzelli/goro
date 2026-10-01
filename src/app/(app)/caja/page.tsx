import { turnoAbierto } from "@/lib/caja";
import { exigirPerfil } from "@/modulos/auth/consultas/perfil";
import { CajaCerrada } from "@/modulos/caja/componentes/CajaCerrada";
import { HistorialTurnos } from "@/modulos/caja/componentes/HistorialTurnos";
import { SeccionTurnoAbierto } from "@/modulos/caja/componentes/SeccionTurnoAbierto";

export const metadata = { title: "Caja" };

export default async function Caja() {
  const [perfil, turno] = await Promise.all([exigirPerfil(), turnoAbierto()]);
  const esDuenio = perfil.rol === "duenio";

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold">Caja</h1>
        <p className="text-texto-suave">Apertura, movimientos y arqueo.</p>
      </header>

      {turno ? <SeccionTurnoAbierto turno={turno} esDuenio={esDuenio} /> : <CajaCerrada />}

      {esDuenio && <HistorialTurnos />}
    </div>
  );
}
