import { listarFormatos } from "@/lib/formatos";
import { PotesYEtiquetas } from "@/modulos/potes/componentes/PotesYEtiquetas";
import { baldesParaArmar, potesEnFreezer } from "@/modulos/potes/consultas/potes";

export const metadata = { title: "Potes" };

export default async function Potes() {
  const [potes, formatos, baldes] = await Promise.all([
    potesEnFreezer(),
    listarFormatos(),
    baldesParaArmar(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold">Potes</h1>
        <p className="text-texto-suave">
          Armá un pote, pesalo, imprimí su etiqueta y guardalo en el freezer. Se cobra escaneando el
          código.
        </p>
      </header>

      <PotesYEtiquetas
        potes={potes}
        formatos={formatos.filter((formato) => formato.activo)}
        baldes={baldes}
      />
    </div>
  );
}
