import { Insignia } from "@/componentes/Insignia";
import type { Balde } from "@/lib/baldes";
import { BotonAbrirBalde } from "./BotonAbrirBalde";
import { BotonAjustarBalde } from "./BotonAjustarBalde";
import { BotonBorrarBalde } from "./BotonBorrarBalde";

const ETIQUETA_ESTADO: Record<string, string> = {
  cerrado: "Cerrado",
  abierto: "Abierto",
};

export function DetalleBaldes({ baldes, esDuenio }: { baldes: Balde[]; esDuenio: boolean }) {
  if (baldes.length === 0) {
    return <p className="text-sm text-texto-suave">Sin baldes en stock.</p>;
  }

  return (
    <ul className="flex flex-col gap-1 text-sm">
      {baldes.map((balde) => (
        <li key={balde.id} className="flex flex-wrap items-center gap-2">
          <span className="numero">{balde.codigo}</span>
          <Insignia variante={balde.estado === "abierto" ? "ok" : "neutra"}>
            {ETIQUETA_ESTADO[balde.estado]}
          </Insignia>
          <span className="numero">{balde.kgRestante} kg</span>
          {balde.estado === "cerrado" && (
            <>
              <BotonAbrirBalde baldeId={balde.id} />
              {esDuenio && <BotonBorrarBalde baldeId={balde.id} codigo={balde.codigo} />}
            </>
          )}
          {balde.estado === "abierto" && <BotonAjustarBalde baldeId={balde.id} />}
        </li>
      ))}
    </ul>
  );
}
