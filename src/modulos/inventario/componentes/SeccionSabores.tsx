import { listarSabores } from "@/lib/sabores";
import { Punto } from "@/componentes/Punto";
import { Tarjeta } from "@/componentes/Tarjeta";
import { BotonActivoSabor } from "./BotonActivoSabor";
import { BotonBorrarSabor } from "./BotonBorrarSabor";
import { EditorColorSabor } from "./EditorColorSabor";
import { EditorNombreSabor } from "./EditorNombreSabor";
import { FormularioMinimo } from "./FormularioMinimo";

export async function SeccionSabores({ esDuenio }: { esDuenio: boolean }) {
  const sabores = await listarSabores();

  return (
    <Tarjeta compacta>
      <header>
        <h2 className="font-display text-base font-semibold">Sabores</h2>
        <p className="text-xs text-texto-suave">El mínimo en blanco usa el default del comercio.</p>
      </header>

      <table className="w-full text-left text-sm">
        <thead className="border-b border-linea font-mono text-xs text-texto-suave uppercase">
          <tr>
            <th className="p-1.5">Color</th>
            <th className="p-1.5">Sabor</th>
            <th className="p-1.5">Mínimo (kg)</th>
            <th className="p-1.5">Estado</th>
            {esDuenio && <th className="p-1.5">Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {sabores.map((sabor) => (
            <tr key={sabor.id} className="border-b border-linea last:border-0">
              <td className="p-1.5">
                {esDuenio ? (
                  <EditorColorSabor saborId={sabor.id} colorActual={sabor.color} />
                ) : (
                  <Punto color={sabor.color} />
                )}
              </td>
              <td className="p-1.5">
                {esDuenio ? (
                  <EditorNombreSabor saborId={sabor.id} nombreActual={sabor.nombre} />
                ) : (
                  sabor.nombre
                )}
              </td>
              <td className="numero p-1.5">
                {esDuenio ? (
                  <FormularioMinimo saborId={sabor.id} valorActual={sabor.stockMinimo} />
                ) : (
                  (sabor.stockMinimo ?? "default")
                )}
              </td>
              <td className="p-1.5">
                {esDuenio ? (
                  <BotonActivoSabor saborId={sabor.id} activo={sabor.activo} />
                ) : sabor.activo ? (
                  "Activo"
                ) : (
                  "Inactivo"
                )}
              </td>
              {esDuenio && (
                <td className="p-1.5">
                  <BotonBorrarSabor saborId={sabor.id} nombre={sabor.nombre} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </Tarjeta>
  );
}
