import { formatearPlata } from "@/lib/plata";
import { ETIQUETA_MEDIO_PAGO, type Cobrado } from "../tipos";

/**
 * La señal de que la venta entró, mientras el carrito espera vacío al próximo
 * cliente: sin esta línea, quien cobra no sabría si tocar "Cobrar" de nuevo.
 *
 * El `<p>` está siempre en el DOM, vacío hasta que hay algo que decir: un
 * lector de pantalla no anuncia una región viva que aparece junto con su
 * propio contenido.
 */
export function AvisoCobrado({ cobrado }: { cobrado: Cobrado | null }) {
  return (
    <p
      role="status"
      className={
        cobrado ? "rounded-(--r) bg-ok-fondo px-3 py-2 text-sm font-semibold text-ok" : "sr-only"
      }
    >
      {cobrado && (
        <>
          Cobrado
          {cobrado.total !== null && (
            <>
              : <span className="numero">{formatearPlata(cobrado.total)}</span>
            </>
          )}
          {" · "}
          {ETIQUETA_MEDIO_PAGO[cobrado.medioPago]}
          {" · #"}
          {cobrado.ventaId}
        </>
      )}
    </p>
  );
}
