import { obtenerConfigComercio } from "@/lib/configComercio";
import { listarBaldes } from "@/lib/baldes";
import { kgPorSabor } from "@/lib/kgPorSabor";
import { listarSabores } from "@/lib/sabores";
import { Tarjeta } from "@/componentes/Tarjeta";
import { FilaBaldesDeSabor } from "./FilaBaldesDeSabor";
import { FormularioStockMinimoDefault } from "./FormularioStockMinimoDefault";

export async function SeccionBaldes({ esDuenio }: { esDuenio: boolean }) {
  const [sabores, baldes, config] = await Promise.all([
    listarSabores(),
    listarBaldes(),
    obtenerConfigComercio(),
  ]);
  const saboresActivos = sabores.filter((sabor) => sabor.activo);
  const kgPorSaborId = kgPorSabor(baldes);

  return (
    <Tarjeta compacta>
      <header className="flex flex-col gap-1.5">
        <h2 className="font-display text-base font-semibold">Baldes</h2>
        <p className="text-xs text-texto-suave">
          Cada balde es una unidad: puede haber varios del mismo sabor a la vez.
        </p>
        {esDuenio && <FormularioStockMinimoDefault valorActual={config.stockMinimoDefault} />}
      </header>

      <div className="flex flex-col gap-2">
        {saboresActivos.map((sabor) => (
          <FilaBaldesDeSabor
            key={sabor.id}
            sabor={sabor}
            baldes={baldes.filter((balde) => balde.saborId === sabor.id)}
            kgRestanteTotal={kgPorSaborId[sabor.id] ?? 0}
            stockMinimoDefault={config.stockMinimoDefault}
          />
        ))}
      </div>
    </Tarjeta>
  );
}
