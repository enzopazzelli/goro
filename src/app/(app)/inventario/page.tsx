import { Suspense } from "react";
import { CargandoSeccion } from "@/componentes/CargandoSeccion";
import { exigirPerfil } from "@/modulos/auth/consultas/perfil";
import { SeccionBaldes } from "@/modulos/inventario/componentes/SeccionBaldes";
import { SeccionFormatos } from "@/modulos/inventario/componentes/SeccionFormatos";
import { SeccionInsumos } from "@/modulos/inventario/componentes/SeccionInsumos";
import { SeccionSabores } from "@/modulos/inventario/componentes/SeccionSabores";

export const metadata = { title: "Inventario" };

export default async function Inventario() {
  const perfil = await exigirPerfil();
  const esDuenio = perfil.rol === "duenio";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold">Inventario</h1>
        <p className="text-texto-suave">Sabores, baldes, insumos y formatos.</p>
      </header>

      <Suspense fallback={<CargandoSeccion titulo="Sabores" />}>
        <SeccionSabores esDuenio={esDuenio} />
      </Suspense>
      <Suspense fallback={<CargandoSeccion titulo="Baldes" />}>
        <SeccionBaldes esDuenio={esDuenio} />
      </Suspense>
      <Suspense fallback={<CargandoSeccion titulo="Insumos" />}>
        <SeccionInsumos esDuenio={esDuenio} />
      </Suspense>
      <Suspense fallback={<CargandoSeccion titulo="Formatos" />}>
        <SeccionFormatos esDuenio={esDuenio} />
      </Suspense>
    </div>
  );
}
