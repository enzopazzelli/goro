import type { ReactNode } from "react";
import { CodigoDeBarras } from "./CodigoDeBarras";

/**
 * Una etiqueta para pegar: lo que dice a simple vista, arriba, y el código de
 * barras abajo. Mide lo de una etiqueta común de hoja A4 (63,5 × 38 mm, tres
 * por fila): así sirve tanto en papel autoadhesivo como en papel común recortado.
 *
 * El código no lleva precio ni peso adentro; lo que se lee a ojo es lo que
 * se imprimió, y lo que cobra el sistema es lo que está en la base.
 */
export function EtiquetaDeCodigo({
  titulo,
  detalle,
  codigo,
}: {
  titulo: string;
  detalle?: ReactNode;
  codigo: string;
}) {
  return (
    <div className="etiqueta flex h-[38mm] flex-col justify-between overflow-hidden rounded-(--r) border border-linea bg-superficie p-2">
      <div className="min-w-0">
        <p className="truncate text-sm leading-tight font-bold">{titulo}</p>
        {detalle && <p className="truncate text-xs leading-tight text-texto-suave">{detalle}</p>}
      </div>
      <CodigoDeBarras valor={codigo} alto={30} />
    </div>
  );
}
