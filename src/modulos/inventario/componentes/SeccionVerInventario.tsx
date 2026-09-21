import { Suspense } from "react";
import { CargandoSeccion } from "@/componentes/CargandoSeccion";
import { SeccionBaldes } from "./SeccionBaldes";
import { SeccionFormatos } from "./SeccionFormatos";
import { SeccionInsumos } from "./SeccionInsumos";
import { SeccionSabores } from "./SeccionSabores";

export function SeccionVerInventario({ esDuenio }: { esDuenio: boolean }) {
  return (
    <div className="flex flex-col gap-3">
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
