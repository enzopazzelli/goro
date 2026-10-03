import { Boton } from "@/componentes/Boton";
import { CLASES_CAMPO, CLASES_ROTULO } from "@/componentes/FiltroDePeriodo";
import { periodoDeAtajo } from "@/lib/periodos";

/**
 * El Excel de la caja de un período: turnos con su arqueo y todos los
 * movimientos. Arranca en el mes que va, que es lo que se pide casi siempre; un
 * form GET común que baja el archivo sin salir de la pantalla.
 */
export function DescargarCaja() {
  const mes = periodoDeAtajo("mes");

  return (
    <form method="get" action="/exportar/caja" className="flex flex-wrap items-end gap-2">
      <label className={CLASES_ROTULO}>
        Desde
        <input type="date" name="desde" defaultValue={mes.desde} className={CLASES_CAMPO} />
      </label>
      <label className={CLASES_ROTULO}>
        Hasta
        <input type="date" name="hasta" defaultValue={mes.hasta} className={CLASES_CAMPO} />
      </label>
      <Boton type="submit" variante="suave">
        <span aria-hidden="true">⬇ </span>
        Descargar Excel
      </Boton>
    </form>
  );
}
