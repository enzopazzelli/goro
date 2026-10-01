import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";

export type TurnoAbierto = { id: number; abiertoPor: string; abiertoEn: string };

/**
 * El turno abierto del LOCAL, no de quien pregunta: hay un solo cajón. Si se
 * filtrara por usuario, el que entra con otra cuenta creería que la caja está
 * cerrada (prompt-base-web.md §4). Lo usan el layout, Ventas y Caja.
 */
export async function turnoAbierto(): Promise<TurnoAbierto | null> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("turnos_caja")
    .select("id, abierto_por, abierto_en")
    .is("cerrado_en", null)
    .maybeSingle();

  return data ? { id: data.id, abiertoPor: data.abierto_por, abiertoEn: data.abierto_en } : null;
}
