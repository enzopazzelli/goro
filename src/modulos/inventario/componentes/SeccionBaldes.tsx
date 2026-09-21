import { obtenerConfigComercio } from "@/lib/configComercio";
import { listarBaldes } from "@/lib/baldes";
import { listarSabores } from "@/lib/sabores";
import { saborEnAlerta } from "../alerta";
import { BotonAbrirBalde } from "./BotonAbrirBalde";
import { BotonAjustarBalde } from "./BotonAjustarBalde";
import { FormularioBalde } from "./FormularioBalde";
import { FormularioStockMinimoDefault } from "./FormularioStockMinimoDefault";

const ETIQUETA_ESTADO: Record<string, string> = {
  cerrado: "Cerrado",
  abierto: "Abierto",
};

export async function SeccionBaldes({ esDuenio }: { esDuenio: boolean }) {
  const [sabores, baldes, config] = await Promise.all([
    listarSabores(),
    listarBaldes(),
    obtenerConfigComercio(),
  ]);
  const saboresActivos = sabores.filter((sabor) => sabor.activo);

  return (
    <section className="flex flex-col gap-4 rounded-(--r-grande) border border-linea bg-superficie p-6">
      <header className="flex flex-col gap-2">
        <h2 className="font-display text-lg font-semibold">Baldes</h2>
        <p className="text-sm text-texto-suave">
          Cada balde es una unidad: puede haber varios del mismo sabor a la vez.
        </p>
        {esDuenio && <FormularioStockMinimoDefault valorActual={config.stockMinimoDefault} />}
      </header>

      <div className="flex flex-col gap-4">
        {saboresActivos.map((sabor) => {
          const deEsteSabor = baldes.filter((balde) => balde.saborId === sabor.id);
          const abierto = deEsteSabor.find((balde) => balde.estado === "abierto") ?? null;
          const enAlerta = saborEnAlerta(sabor, abierto, config.stockMinimoDefault);

          return (
            <div key={sabor.id} className="rounded-(--r) border border-linea p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="font-semibold">{sabor.nombre}</span>
                {enAlerta && (
                  <span className="rounded-(--r) bg-alerta-fondo px-2 py-0.5 text-xs text-alerta">
                    {abierto ? "Se está por acabar" : "Sin balde abierto"}
                  </span>
                )}
              </div>

              {deEsteSabor.length === 0 ? (
                <p className="text-sm text-texto-suave">Sin baldes en stock.</p>
              ) : (
                <ul className="flex flex-col gap-1 text-sm">
                  {deEsteSabor.map((balde) => (
                    <li key={balde.id} className="flex items-center gap-3">
                      <span className="numero">{balde.codigo}</span>
                      <span>{ETIQUETA_ESTADO[balde.estado]}</span>
                      <span className="numero">{balde.kgRestante} kg</span>
                      {balde.estado === "cerrado" && <BotonAbrirBalde baldeId={balde.id} />}
                      {balde.estado === "abierto" && <BotonAjustarBalde baldeId={balde.id} />}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <FormularioBalde sabores={saboresActivos} />
    </section>
  );
}
