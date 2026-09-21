import { listarFormatos } from "@/lib/formatos";
import { Tarjeta } from "@/componentes/Tarjeta";
import { FilaFormato } from "./FilaFormato";

export async function SeccionFormatos({ esDuenio }: { esDuenio: boolean }) {
  const formatos = await listarFormatos();

  return (
    <Tarjeta compacta>
      <header>
        <h2 className="font-display text-base font-semibold">Formatos</h2>
        <p className="text-xs text-texto-suave">
          Cucurucho, vasito, 1/4, 1/2, kilo: mismo precio sin importar el sabor.
        </p>
      </header>

      {formatos.length === 0 ? (
        <p className="text-sm text-texto-suave">Todavía no hay formatos cargados.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {formatos.map((formato) => (
            <FilaFormato key={formato.id} formato={formato} esDuenio={esDuenio} />
          ))}
        </div>
      )}
    </Tarjeta>
  );
}
