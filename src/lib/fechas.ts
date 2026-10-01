import { ZONA_HORARIA } from "@/config/comercio";

const PARTES = new Intl.DateTimeFormat("es-AR", {
  timeZone: ZONA_HORARIA,
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/**
 * Se arma con las partes y no con `format()`: el separador de la fecha cambia
 * según la versión de ICU (Node escribe "01-10", un navegador "01/10"), y un
 * texto que sale distinto en el servidor y en el navegador rompe la hidratación.
 */
function partes(iso: string): Record<string, string> {
  const resultado: Record<string, string> = {};
  for (const parte of PARTES.formatToParts(new Date(iso))) resultado[parte.type] = parte.value;
  return resultado;
}

/** "14:30", en la hora del local aunque se renderice en un servidor en UTC. */
export function horaDe(iso: string): string {
  const p = partes(iso);
  return `${p.hour}:${p.minute}`;
}

/** "jue 01/10, 14:30". */
export function diaYHoraDe(iso: string): string {
  const p = partes(iso);
  return `${p.weekday} ${p.day}/${p.month}, ${p.hour}:${p.minute}`;
}
