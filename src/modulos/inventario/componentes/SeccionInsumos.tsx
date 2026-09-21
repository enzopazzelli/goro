import { Tarjeta } from "@/componentes/Tarjeta";
import { listarInsumos } from "../consultas/insumos";
import { FilaInsumo } from "./FilaInsumo";
import { FormularioInsumo } from "./FormularioInsumo";

export async function SeccionInsumos({ esDuenio }: { esDuenio: boolean }) {
  const insumos = await listarInsumos();

  return (
    <Tarjeta>
      <header>
        <h2 className="font-display text-lg font-semibold">Insumos</h2>
        <p className="text-sm text-texto-suave">Cucuruchos, potes vacíos, salsas.</p>
      </header>

      {insumos.length === 0 ? (
        <p className="text-sm text-texto-suave">Todavía no hay insumos cargados.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {insumos.map((insumo) => (
            <FilaInsumo key={insumo.id} insumo={insumo} esDuenio={esDuenio} />
          ))}
        </div>
      )}

      {esDuenio && <FormularioInsumo />}
    </Tarjeta>
  );
}
