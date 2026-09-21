import { listarFormatos } from "@/lib/formatos";
import { FilaFormato } from "./FilaFormato";
import { FormularioFormato } from "./FormularioFormato";

export async function SeccionFormatos({ esDuenio }: { esDuenio: boolean }) {
  const formatos = await listarFormatos();

  return (
    <section className="flex flex-col gap-4 rounded-(--r-grande) border border-linea bg-superficie p-6">
      <header>
        <h2 className="font-display text-lg font-semibold">Formatos</h2>
        <p className="text-sm text-texto-suave">
          Cucurucho, vasito, 1/4, 1/2, kilo: mismo precio sin importar el sabor.
        </p>
      </header>

      {formatos.length === 0 ? (
        <p className="text-sm text-texto-suave">Todavía no hay formatos cargados.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {formatos.map((formato) => (
            <FilaFormato key={formato.id} formato={formato} esDuenio={esDuenio} />
          ))}
        </div>
      )}

      {esDuenio && <FormularioFormato />}
    </section>
  );
}
