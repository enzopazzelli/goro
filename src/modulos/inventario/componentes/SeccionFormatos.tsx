import { listarFormatos } from "@/lib/formatos";
import { listarPresentaciones } from "@/lib/presentaciones";
import { Tarjeta } from "@/componentes/Tarjeta";
import { listarInsumos } from "../consultas/insumos";
import { EnvaseFormato } from "./EnvaseFormato";
import { FilaFormato } from "./FilaFormato";

export async function SeccionFormatos({ esDuenio }: { esDuenio: boolean }) {
  const [formatos, insumos, presentaciones] = await Promise.all([
    listarFormatos(),
    listarInsumos(),
    listarPresentaciones(),
  ]);

  return (
    <Tarjeta compacta>
      <header>
        <h2 className="font-display text-base font-semibold">Formatos</h2>
        <p className="text-xs text-texto-suave">
          Cucurucho, vasito, 1/4, 1/2, kilo: mismo precio sin importar el sabor. Los que se sirven
          en cono, canasta o vasito llevan su envase, que también se vende suelto.
        </p>
      </header>

      {formatos.length === 0 ? (
        <p className="text-sm text-texto-suave">Todavía no hay formatos cargados.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {formatos.map((formato) => {
            const envase = insumos.find((insumo) => insumo.formatoId === formato.id) ?? null;
            return (
              <div key={formato.id} className="flex flex-col gap-1">
                <FilaFormato formato={formato} esDuenio={esDuenio} />
                <EnvaseFormato
                  formatoId={formato.id}
                  envase={envase}
                  presentaciones={presentaciones.filter(
                    (presentacion) => presentacion.insumoId === envase?.id,
                  )}
                  esDuenio={esDuenio}
                />
              </div>
            );
          })}
        </div>
      )}
    </Tarjeta>
  );
}
