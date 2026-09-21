import { listarSabores } from "@/lib/sabores";
import { BotonActivoSabor } from "./BotonActivoSabor";
import { FormularioMinimo } from "./FormularioMinimo";
import { FormularioSabor } from "./FormularioSabor";

export async function SeccionSabores({ esDuenio }: { esDuenio: boolean }) {
  const sabores = await listarSabores();

  return (
    <section className="flex flex-col gap-4 rounded-(--r-grande) border border-linea bg-superficie p-6">
      <header>
        <h2 className="font-display text-lg font-semibold">Sabores</h2>
        <p className="text-sm text-texto-suave">El mínimo en blanco usa el default del comercio.</p>
      </header>

      <table className="w-full text-left text-sm">
        <thead className="border-b border-linea text-xs text-texto-suave uppercase">
          <tr>
            <th className="p-2">Sabor</th>
            <th className="p-2">Mínimo (kg)</th>
            <th className="p-2">Estado</th>
          </tr>
        </thead>
        <tbody>
          {sabores.map((sabor) => (
            <tr key={sabor.id} className="border-b border-linea last:border-0">
              <td className="p-2">{sabor.nombre}</td>
              <td className="numero p-2">
                {esDuenio ? (
                  <FormularioMinimo saborId={sabor.id} valorActual={sabor.stockMinimo} />
                ) : (
                  (sabor.stockMinimo ?? "default")
                )}
              </td>
              <td className="p-2">
                {esDuenio ? (
                  <BotonActivoSabor saborId={sabor.id} activo={sabor.activo} />
                ) : sabor.activo ? (
                  "Activo"
                ) : (
                  "Inactivo"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {esDuenio && <FormularioSabor />}
    </section>
  );
}
