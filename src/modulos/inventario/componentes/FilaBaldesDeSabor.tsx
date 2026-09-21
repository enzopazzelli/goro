import { Cubeta } from "@/componentes/Cubeta";
import { Insignia } from "@/componentes/Insignia";
import type { Balde } from "@/lib/baldes";
import type { Sabor } from "@/lib/sabores";
import { saborEnAlerta } from "../alerta";
import { BotonAbrirBalde } from "./BotonAbrirBalde";
import { BotonAjustarBalde } from "./BotonAjustarBalde";
import { BotonBorrarBalde } from "./BotonBorrarBalde";

const ETIQUETA_ESTADO: Record<string, string> = {
  cerrado: "Cerrado",
  abierto: "Abierto",
};

export function FilaBaldesDeSabor({
  sabor,
  baldes,
  kgRestanteTotal,
  stockMinimoDefault,
}: {
  sabor: Sabor;
  baldes: Balde[];
  kgRestanteTotal: number;
  stockMinimoDefault: number;
}) {
  const abierto = baldes.find((balde) => balde.estado === "abierto") ?? null;
  const kgInicialTotal = baldes.reduce((suma, balde) => suma + balde.kgInicial, 0);
  const pct = kgInicialTotal > 0 ? (kgRestanteTotal / kgInicialTotal) * 100 : 0;

  let insignia: { variante: "ok" | "advertencia" | "alerta"; texto: string };
  if (!abierto) {
    insignia = { variante: "alerta", texto: "Sin balde abierto" };
  } else if (saborEnAlerta(sabor, abierto, stockMinimoDefault)) {
    insignia = { variante: "advertencia", texto: "Se está por acabar" };
  } else {
    insignia = { variante: "ok", texto: "Ok" };
  }

  return (
    <div className="flex items-start gap-2 rounded-(--r) border border-linea p-2">
      <Cubeta pct={pct} color={sabor.color} bajo={insignia.variante !== "ok"} />

      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{sabor.nombre}</span>
          <Insignia variante={insignia.variante}>{insignia.texto}</Insignia>
        </div>

        {baldes.length === 0 ? (
          <p className="text-sm text-texto-suave">Sin baldes en stock.</p>
        ) : (
          <ul className="flex flex-col gap-0.5 text-sm">
            {baldes.map((balde) => (
              <li key={balde.id} className="flex items-center gap-3">
                <span className="numero">{balde.codigo}</span>
                <Insignia variante={balde.estado === "abierto" ? "ok" : "neutra"}>
                  {ETIQUETA_ESTADO[balde.estado]}
                </Insignia>
                <span className="numero">{balde.kgRestante} kg</span>
                {balde.estado === "cerrado" && (
                  <>
                    <BotonAbrirBalde baldeId={balde.id} />
                    <BotonBorrarBalde baldeId={balde.id} codigo={balde.codigo} />
                  </>
                )}
                {balde.estado === "abierto" && <BotonAjustarBalde baldeId={balde.id} />}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
