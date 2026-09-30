import type { Presentacion } from "@/lib/presentaciones";
import { FilaPresentacion } from "./FilaPresentacion";
import { FormularioPresentacion } from "./FormularioPresentacion";

/**
 * Una presentación nueva nace inactiva y sin precio; recién sale a la venta
 * cuando se le pone un precio y se tilda "A la venta".
 */
export function PresentacionesInsumo({
  insumoId,
  presentaciones,
}: {
  insumoId: number;
  presentaciones: Presentacion[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-mono text-xs tracking-wide text-texto-suave uppercase">
        Presentaciones a la venta
      </h3>
      {presentaciones.length === 0 ? (
        <p className="text-xs text-texto-suave">Todavía no se vende suelto.</p>
      ) : (
        presentaciones.map((presentacion) => (
          <FilaPresentacion key={presentacion.id} presentacion={presentacion} />
        ))
      )}
      <FormularioPresentacion insumoId={insumoId} />
    </div>
  );
}
