import { Pestanas } from "@/componentes/Pestanas";
import { Tarjeta } from "@/componentes/Tarjeta";
import { SeccionFormatos } from "./SeccionFormatos";
import { SeccionStockInsumos } from "./SeccionStockInsumos";
import { SeccionStockSabores } from "./SeccionStockSabores";

export function SeccionVerInventario({ esDuenio }: { esDuenio: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <Tarjeta compacta>
        <Pestanas
          tabs={[
            { etiqueta: "Sabores", contenido: <SeccionStockSabores esDuenio={esDuenio} /> },
            { etiqueta: "Insumos", contenido: <SeccionStockInsumos esDuenio={esDuenio} /> },
          ]}
        />
      </Tarjeta>
      <SeccionFormatos esDuenio={esDuenio} />
    </div>
  );
}
