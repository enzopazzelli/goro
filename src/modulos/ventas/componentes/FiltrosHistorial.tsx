import Link from "next/link";
import { Boton } from "@/componentes/Boton";
import { clasesDePildora } from "@/componentes/Pildora";
import { periodoDeAtajo, type Atajo, type Periodo } from "@/lib/periodos";
import { ETIQUETA_MEDIO_PAGO, MEDIOS_DE_PAGO, type MedioPago } from "../tipos";

const ATAJOS: readonly { atajo: Atajo; etiqueta: string }[] = [
  { atajo: "dia", etiqueta: "Hoy" },
  { atajo: "semana", etiqueta: "Esta semana" },
  { atajo: "mes", etiqueta: "Este mes" },
];

const CAMPO = "rounded-(--r) border border-linea bg-superficie px-3 py-2 text-sm";
const ROTULO = "flex flex-col gap-1 font-mono text-xs tracking-wide text-texto-suave uppercase";

/**
 * El filtro vive en la URL y no en estado del navegador: así "las
 * transferencias de la semana" es un link que se puede guardar, el botón Atrás
 * funciona, y la pantalla se sigue armando en el servidor.
 */
export function FiltrosHistorial({
  periodo,
  medioPago,
}: {
  periodo: Periodo;
  medioPago: MedioPago | null;
}) {
  function destino(otro: Periodo): string {
    const parametros = new URLSearchParams({ desde: otro.desde, hasta: otro.hasta });
    // El medio elegido sobrevive al cambio de fechas: casi siempre se está
    // mirando "las transferencias de..." y lo que se mueve es el período.
    if (medioPago) parametros.set("medio", medioPago);
    return `/historial?${parametros}`;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1">
        {ATAJOS.map(({ atajo, etiqueta }) => {
          const suyo = periodoDeAtajo(atajo);
          return (
            <Link
              key={atajo}
              href={destino(suyo)}
              className={clasesDePildora(
                suyo.desde === periodo.desde && suyo.hasta === periodo.hasta,
              )}
            >
              {etiqueta}
            </Link>
          );
        })}
      </div>

      {/* GET y no una acción: lo que se filtra tiene que terminar en la URL. */}
      <form method="get" className="flex flex-wrap items-end gap-2">
        <label className={ROTULO}>
          Desde
          <input type="date" name="desde" defaultValue={periodo.desde} className={CAMPO} />
        </label>
        <label className={ROTULO}>
          Hasta
          <input type="date" name="hasta" defaultValue={periodo.hasta} className={CAMPO} />
        </label>
        <label className={ROTULO}>
          Medio de pago
          <select name="medio" defaultValue={medioPago ?? ""} className={CAMPO}>
            <option value="">Todos</option>
            {MEDIOS_DE_PAGO.map((medio) => (
              <option key={medio} value={medio}>
                {ETIQUETA_MEDIO_PAGO[medio]}
              </option>
            ))}
          </select>
        </label>
        <Boton type="submit" variante="suave">
          Buscar
        </Boton>
      </form>
    </div>
  );
}
