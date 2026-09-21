import { Tarjeta } from "@/componentes/Tarjeta";
import type { Sabor } from "@/lib/sabores";
import { FormularioBalde } from "./FormularioBalde";
import { FormularioFormato } from "./FormularioFormato";
import { FormularioInsumo } from "./FormularioInsumo";
import { FormularioSabor } from "./FormularioSabor";

export function SeccionCargarInventario({
  esDuenio,
  saboresActivos,
}: {
  esDuenio: boolean;
  saboresActivos: Sabor[];
}) {
  return (
    <div className="flex flex-col gap-3">
      {esDuenio && (
        <Tarjeta compacta>
          <h2 className="font-display text-base font-semibold">Sabor nuevo</h2>
          <FormularioSabor />
        </Tarjeta>
      )}
      <Tarjeta compacta>
        <h2 className="font-display text-base font-semibold">Balde nuevo</h2>
        <FormularioBalde sabores={saboresActivos} />
      </Tarjeta>
      {esDuenio && (
        <Tarjeta compacta>
          <h2 className="font-display text-base font-semibold">Insumo nuevo</h2>
          <FormularioInsumo />
        </Tarjeta>
      )}
      {esDuenio && (
        <Tarjeta compacta>
          <h2 className="font-display text-base font-semibold">Formato nuevo</h2>
          <FormularioFormato />
        </Tarjeta>
      )}
    </div>
  );
}
