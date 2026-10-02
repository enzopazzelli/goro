import { CLASES_CAMPO, CLASES_ROTULO, FiltroDePeriodo } from "@/componentes/FiltroDePeriodo";
import type { Periodo } from "@/lib/periodos";
import { ETIQUETA_MEDIO_PAGO, MEDIOS_DE_PAGO, type MedioPago } from "../tipos";

/**
 * El período compartido con el Panel, más lo único propio del Historial: el
 * medio de pago. Va dentro del mismo form para que se envíe en el mismo submit,
 * y los atajos de fecha lo conservan — casi siempre se está mirando "las
 * transferencias de..." y lo que se mueve es el período.
 */
export function FiltrosHistorial({
  periodo,
  medioPago,
}: {
  periodo: Periodo;
  medioPago: MedioPago | null;
}) {
  return (
    <FiltroDePeriodo
      ruta="/historial"
      periodo={periodo}
      parametrosExtra={medioPago ? { medio: medioPago } : {}}
    >
      <label className={CLASES_ROTULO}>
        Medio de pago
        <select name="medio" defaultValue={medioPago ?? ""} className={CLASES_CAMPO}>
          <option value="">Todos</option>
          {MEDIOS_DE_PAGO.map((medio) => (
            <option key={medio} value={medio}>
              {ETIQUETA_MEDIO_PAGO[medio]}
            </option>
          ))}
        </select>
      </label>
    </FiltroDePeriodo>
  );
}
