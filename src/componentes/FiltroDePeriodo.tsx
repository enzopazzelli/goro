import Link from "next/link";
import type { ReactNode } from "react";
import { Boton } from "@/componentes/Boton";
import { clasesDePildora } from "@/componentes/Pildora";
import { periodoDeAtajo, type Atajo, type Periodo } from "@/lib/periodos";

const ATAJOS: readonly { atajo: Atajo; etiqueta: string }[] = [
  { atajo: "dia", etiqueta: "Hoy" },
  { atajo: "semana", etiqueta: "Esta semana" },
  { atajo: "mes", etiqueta: "Este mes" },
];

/** Para que los campos que cada pantalla agregue al form se vean igual que estos. */
export const CLASES_CAMPO = "rounded-(--r) border border-linea bg-superficie px-3 py-2 text-sm";
export const CLASES_ROTULO =
  "flex flex-col gap-1 font-mono text-xs tracking-wide text-texto-suave uppercase";

/**
 * El período vive en la URL y no en estado del navegador: así "la semana
 * pasada" es un link que se puede guardar, el botón Atrás funciona y la
 * pantalla se sigue armando en el servidor. Un `form method="get"`, sin una
 * línea de JavaScript.
 *
 * Lo comparten el Historial y el Panel; cada uno le agrega sus propios campos
 * como `children` para que se envíen en el mismo submit.
 */
export function FiltroDePeriodo({
  ruta,
  periodo,
  parametrosExtra = {},
  children,
}: {
  ruta: string;
  periodo: Periodo;
  /** Lo que los atajos conservan al mover las fechas (en el Historial, el medio de pago). */
  parametrosExtra?: Record<string, string>;
  children?: ReactNode;
}) {
  function destino(otro: Periodo): string {
    const parametros = new URLSearchParams({
      desde: otro.desde,
      hasta: otro.hasta,
      ...parametrosExtra,
    });
    return `${ruta}?${parametros}`;
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

      <form method="get" action={ruta} className="flex flex-wrap items-end gap-2">
        <label className={CLASES_ROTULO}>
          Desde
          <input type="date" name="desde" defaultValue={periodo.desde} className={CLASES_CAMPO} />
        </label>
        <label className={CLASES_ROTULO}>
          Hasta
          <input type="date" name="hasta" defaultValue={periodo.hasta} className={CLASES_CAMPO} />
        </label>
        {children}
        <Boton type="submit" variante="suave">
          Buscar
        </Boton>
      </form>
    </div>
  );
}
