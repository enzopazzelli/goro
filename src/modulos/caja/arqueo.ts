import { formatearPlata } from "@/lib/plata";

export type LecturaDiferencia = {
  texto: string;
  variante: "ok" | "advertencia" | "alerta";
};

/**
 * Se muestra siempre, también cuando da cero: si solo apareciera cuando falta
 * plata, nadie confiaría en el número (mismo criterio que el mockup).
 */
export function textoDiferencia(diferencia: number): LecturaDiferencia {
  if (diferencia === 0) return { texto: "Cierra justo", variante: "ok" };
  if (diferencia > 0)
    return { texto: `Sobran ${formatearPlata(diferencia)}`, variante: "advertencia" };
  return { texto: `Faltan ${formatearPlata(-diferencia)}`, variante: "alerta" };
}
