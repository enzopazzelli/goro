import { obtenerConfigComercio } from "@/lib/configComercio";
import { listarBaldes } from "@/lib/baldes";
import { kgPorSabor } from "@/lib/kgPorSabor";
import { listarSabores } from "@/lib/sabores";
import { Cubeta } from "@/componentes/Cubeta";
import { Insignia } from "@/componentes/Insignia";
import { Tarjeta } from "@/componentes/Tarjeta";
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
  const kgPorSaborId = kgPorSabor(baldes);

  return (
    <Tarjeta>
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
          const kgRestanteTotal = kgPorSaborId[sabor.id] ?? 0;
          const kgInicialTotal = deEsteSabor.reduce((suma, balde) => suma + balde.kgInicial, 0);
          const pct = kgInicialTotal > 0 ? (kgRestanteTotal / kgInicialTotal) * 100 : 0;

          let insignia: { variante: "ok" | "advertencia" | "alerta"; texto: string };
          if (!abierto) {
            insignia = { variante: "alerta", texto: "Sin balde abierto" };
          } else if (saborEnAlerta(sabor, abierto, config.stockMinimoDefault)) {
            insignia = { variante: "advertencia", texto: "Se está por acabar" };
          } else {
            insignia = { variante: "ok", texto: "Ok" };
          }

          return (
            <div
              key={sabor.id}
              className="flex items-start gap-3 rounded-(--r) border border-linea p-3"
            >
              <Cubeta pct={pct} color={sabor.color} bajo={insignia.variante !== "ok"} />

              <div className="flex flex-1 flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{sabor.nombre}</span>
                  <Insignia variante={insignia.variante}>{insignia.texto}</Insignia>
                </div>

                {deEsteSabor.length === 0 ? (
                  <p className="text-sm text-texto-suave">Sin baldes en stock.</p>
                ) : (
                  <ul className="flex flex-col gap-1 text-sm">
                    {deEsteSabor.map((balde) => (
                      <li key={balde.id} className="flex items-center gap-3">
                        <span className="numero">{balde.codigo}</span>
                        <Insignia variante={balde.estado === "abierto" ? "ok" : "neutra"}>
                          {ETIQUETA_ESTADO[balde.estado]}
                        </Insignia>
                        <span className="numero">{balde.kgRestante} kg</span>
                        {balde.estado === "cerrado" && <BotonAbrirBalde baldeId={balde.id} />}
                        {balde.estado === "abierto" && <BotonAjustarBalde baldeId={balde.id} />}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <FormularioBalde sabores={saboresActivos} />
    </Tarjeta>
  );
}
