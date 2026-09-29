import { Tarjeta } from "@/componentes/Tarjeta";
import { listarPresentaciones } from "@/lib/presentaciones";
import { obtenerFilasSabores } from "../consultas/filasSabores";
import { listarInsumos } from "../consultas/insumos";
import { PanelStock } from "./PanelStock";
import { SeccionFormatos } from "./SeccionFormatos";

export async function SeccionVerInventario({ esDuenio }: { esDuenio: boolean }) {
  const [filasSabores, insumos, presentaciones] = await Promise.all([
    obtenerFilasSabores(),
    listarInsumos(),
    listarPresentaciones(),
  ]);

  return (
    <div className="flex flex-col gap-3">
      <Tarjeta compacta>
        <PanelStock
          filasSabores={filasSabores}
          insumos={insumos}
          presentaciones={presentaciones}
          esDuenio={esDuenio}
        />
      </Tarjeta>
      <SeccionFormatos esDuenio={esDuenio} />
    </div>
  );
}
