import { formatearPlata } from "@/lib/plata";
import type { Cobrado } from "../ticket";
import { ETIQUETA_MEDIO_PAGO } from "../tipos";

/**
 * La señal de que la venta entró. El carrito ya quedó vacío para el próximo
 * cliente; sin esta línea, quien cobra no sabría si tocar "Cobrar" de nuevo.
 */
export function AvisoCobrado({ cobrado }: { cobrado: Cobrado | null }) {
  if (!cobrado) return null;

  return (
    <p role="status" className="rounded-(--r) bg-ok-fondo px-3 py-2 text-sm font-semibold text-ok">
      Cobrado: <span className="numero">{formatearPlata(cobrado.total)}</span> ·{" "}
      {ETIQUETA_MEDIO_PAGO[cobrado.medioPago]}
    </p>
  );
}
