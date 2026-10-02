import { formatearKilos } from "@/lib/kilos";
import { proporcionDe } from "../grafico";
import type { KilosDeSabor } from "../tipos";

/**
 * El ranking en kilos y no en plata: lo que sirve para comprar es cuánta
 * Frutilla se fue. El precio del pote no depende del sabor, así que repartirlo
 * entre los sabores elegidos daría un número inventado.
 */
export function KilosPorSabor({ porSabor }: { porSabor: KilosDeSabor[] }) {
  if (porSabor.length === 0) {
    return <p className="text-sm text-texto-suave">Todavía no salió helado en este período.</p>;
  }

  const mayor = porSabor[0]?.kg ?? 0;

  return (
    <ol className="flex flex-col gap-2">
      {porSabor.map((sabor) => (
        <li key={sabor.saborId} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span>{sabor.saborNombre}</span>
            <span className="numero text-texto-suave">{formatearKilos(sabor.kg)}</span>
          </div>
          {/* La barra es decoración del número que está arriba: no se anuncia. */}
          <div aria-hidden="true" className="h-2 rounded-full bg-superficie-honda">
            <div
              className="h-2 rounded-full bg-acento"
              style={{ width: `${proporcionDe(sabor.kg, mayor) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}
