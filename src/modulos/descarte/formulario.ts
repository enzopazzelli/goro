import { esClaveValida } from "@/lib/claveUnica";
import { esMotivoAElegir, type MotivoAElegir } from "./tipos";

/** El mismo tope que el `check` de la base: acá es para avisar antes y en castellano. */
export const LARGO_MAXIMO_DE_NOTA = 200;

export type DescarteLeido = {
  codigo: string | null;
  insumoId: number | null;
  cantidad: number;
  motivo: MotivoAElegir;
  nota: string | null;
  clave: string | null;
};

function textoDe(datos: FormData, campo: string): string {
  const valor = datos.get(campo);
  return typeof valor === "string" ? valor.trim() : "";
}

/** Qué se tira. Si vino un código, manda el código: es lo que se escaneó recién. */
function leerQue(
  datos: FormData,
): { codigo: string | null; insumoId: number | null } | { error: string } {
  const codigo = textoDe(datos, "codigo");
  if (codigo) return { codigo, insumoId: null };

  const insumoId = Number(textoDe(datos, "insumoId"));
  if (!Number.isInteger(insumoId) || insumoId <= 0) {
    return { error: "Escaneá el código o elegí qué se tira." };
  }
  return { codigo: null, insumoId };
}

/**
 * Lo que mandó el formulario de descarte, validado. La base vuelve a revisar
 * todo (regla 4): esto es para contestar rápido, sin ir y volver.
 */
export function leerDescarte(datos: FormData): DescarteLeido | { error: string } {
  const que = leerQue(datos);
  if ("error" in que) return que;

  const cantidad = Number(textoDe(datos, "cantidad"));
  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    return { error: "La cantidad tiene que ser mayor a cero." };
  }

  const motivo = datos.get("motivo");
  if (!esMotivoAElegir(motivo)) return { error: "Elegí por qué se tira." };

  const nota = textoDe(datos, "nota");
  if (nota.length > LARGO_MAXIMO_DE_NOTA) {
    return { error: `La nota puede tener hasta ${LARGO_MAXIMO_DE_NOTA} letras.` };
  }

  const clave = textoDe(datos, "clave");
  return {
    ...que,
    cantidad,
    motivo,
    nota: nota || null,
    clave: esClaveValida(clave) ? clave : null,
  };
}
