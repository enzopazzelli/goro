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

const RELOJ = new Intl.DateTimeFormat("es-AR", {
  timeZone: ZONA_HORARIA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/**
 * La hora de pared del local, puesta como si fuera UTC: un instante de las
 * 15:30 UTC (12:30 en el local) vuelve como `12:30Z`. Excel guarda las fechas
 * sin zona, así que en el archivo tiene que verse la hora que marcaba el reloj
 * del mostrador, no la del servidor.
 */
export function relojDelLocal(iso: string): Date {
  const p: Record<string, string> = {};
  for (const parte of RELOJ.formatToParts(new Date(iso))) p[parte.type] = parte.value;

  return new Date(
    Date.UTC(
      Number(p.year),
      Number(p.month) - 1,
      Number(p.day),
      Number(p.hour),
      Number(p.minute),
      Number(p.second),
    ),
  );
}
