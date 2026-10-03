import { EnlaceDeDescarga } from "@/componentes/EnlaceDeDescarga";
import { Tarjeta } from "@/componentes/Tarjeta";
import { listarBaldesVacios } from "@/lib/baldes";
import { obtenerConfigComercio } from "@/lib/configComercio";
import { listarPresentaciones } from "@/lib/presentaciones";
import { obtenerFilasSabores } from "../consultas/filasSabores";
import { listarInsumos } from "../consultas/insumos";
import { BaldesPorCanjear } from "./BaldesPorCanjear";
import { FormularioPrecioBaldeDefault } from "./FormularioPrecioBaldeDefault";
import { PanelStock } from "./PanelStock";
import { SeccionFormatos } from "./SeccionFormatos";

export async function SeccionVerInventario({ esDuenio }: { esDuenio: boolean }) {
  const [filasSabores, insumos, presentaciones, vacios, config] = await Promise.all([
    obtenerFilasSabores(),
    listarInsumos(),
    listarPresentaciones(),
    listarBaldesVacios(),
    obtenerConfigComercio(),
  ]);

  return (
    <div className="flex flex-col gap-3">
      {esDuenio && (
        <div className="flex justify-end">
          <EnlaceDeDescarga href="/exportar/inventario">
            Descargar inventario en Excel
          </EnlaceDeDescarga>
        </div>
      )}
      <Tarjeta compacta>
        <PanelStock
          filasSabores={filasSabores}
          insumos={insumos}
          presentaciones={presentaciones}
          esDuenio={esDuenio}
        />
      </Tarjeta>
      {/* Solo aparece cuando hay algo que entregar: una lista vacía no es una tarea. */}
      {vacios.length > 0 && (
        <Tarjeta compacta>
          <BaldesPorCanjear baldes={vacios} />
        </Tarjeta>
      )}
      {esDuenio && (
        <Tarjeta compacta>
          <FormularioPrecioBaldeDefault valorActual={config.precioBaldeDefault} />
        </Tarjeta>
      )}
      <SeccionFormatos esDuenio={esDuenio} />
    </div>
  );
}
