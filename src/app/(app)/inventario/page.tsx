import { Pestanas } from "@/componentes/Pestanas";
import { listarSabores } from "@/lib/sabores";
import { exigirPerfil } from "@/modulos/auth/consultas/perfil";
import { SeccionCargarInventario } from "@/modulos/inventario/componentes/SeccionCargarInventario";
import { SeccionVerInventario } from "@/modulos/inventario/componentes/SeccionVerInventario";

export const metadata = { title: "Inventario" };

export default async function Inventario() {
  const perfil = await exigirPerfil();
  const esDuenio = perfil.rol === "duenio";
  const sabores = await listarSabores();
  const saboresActivos = sabores.filter((sabor) => sabor.activo);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold">Inventario</h1>
        <p className="text-texto-suave">Sabores, baldes, insumos y formatos.</p>
      </header>

      <Pestanas
        ver={<SeccionVerInventario esDuenio={esDuenio} />}
        cargar={<SeccionCargarInventario esDuenio={esDuenio} saboresActivos={saboresActivos} />}
      />
    </div>
  );
}
