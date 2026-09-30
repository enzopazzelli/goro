import { Insignia } from "@/componentes/Insignia";
import { estadoDeInsumo, type EstadoInsumo } from "../alerta";

const INSIGNIA: Record<EstadoInsumo, { variante: "alerta" | "advertencia" | "ok"; texto: string }> =
  {
    negativo: { variante: "alerta", texto: "Negativo: recontar" },
    bajo: { variante: "advertencia", texto: "Reponer" },
    ok: { variante: "ok", texto: "Ok" },
  };

/** El estado de un stock en una palabra: la misma en insumos, productos y envases. */
export function InsigniaStock({ cantidad, minimo }: { cantidad: number; minimo: number }) {
  const insignia = INSIGNIA[estadoDeInsumo(cantidad, minimo)];
  return <Insignia variante={insignia.variante}>{insignia.texto}</Insignia>;
}
