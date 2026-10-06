import type {
  Descarte,
  MotivoDelPeriodo,
  MotivoDescarte,
  RenglonDeDescarte,
  ResumenDeDescarte,
} from "./tipos";

const porPlata = <T extends { costo: number }>(a: T, b: T) => b.costo - a.costo;

/** Los kilos se suman en coma flotante: 0,4 + 0,25 no da 0,65 exacto. */
const redondear = (cantidad: number) => Math.round(cantidad * 1000) / 1000;

/**
 * Lo que ve el dueño de un período: cuánto se tiró en plata, qué es lo que más
 * se tira y por qué. Se ordena por plata y no por cantidad: dos kilos de helado
 * y dos cucuruchos no se comparan en unidades.
 */
export function resumirDescartes(descartes: Descarte[]): ResumenDeDescarte {
  const renglones = new Map<string, RenglonDeDescarte>();
  const motivos = new Map<MotivoDescarte, MotivoDelPeriodo>();
  let total = 0;

  for (const descarte of descartes) {
    total += descarte.costo;

    const renglon = renglones.get(descarte.grupo) ?? {
      grupo: descarte.grupo,
      que: descarte.que,
      unidad: descarte.unidad,
      cantidad: 0,
      costo: 0,
      veces: 0,
    };
    renglon.cantidad = redondear(renglon.cantidad + descarte.cantidad);
    renglon.costo += descarte.costo;
    renglon.veces += 1;
    renglones.set(descarte.grupo, renglon);

    const motivo = motivos.get(descarte.motivo) ?? { motivo: descarte.motivo, veces: 0, costo: 0 };
    motivo.veces += 1;
    motivo.costo += descarte.costo;
    motivos.set(descarte.motivo, motivo);
  }

  return {
    total,
    ranking: [...renglones.values()].sort(porPlata),
    porMotivo: [...motivos.values()].sort(porPlata),
  };
}
