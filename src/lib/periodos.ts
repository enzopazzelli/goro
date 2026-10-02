import { ZONA_HORARIA } from "@/config/comercio";

/**
 * Un período del calendario del local: dos días, el de cierre incluido. Las
 * pantallas que filtran por fecha (Historial, y el Panel y el Excel cuando
 * lleguen) hablan en estos términos; la traducción a instantes es `rangoUtc`.
 */
export type Periodo = { desde: string; hasta: string };

/** Los tres botones que cubren el 99% de las consultas: el día, la semana y el mes. */
export type Atajo = "dia" | "semana" | "mes";

const DIA = /^\d{4}-\d{2}-\d{2}$/;

const PARTES = new Intl.DateTimeFormat("es-AR", {
  timeZone: ZONA_HORARIA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** Se arma con las partes y no con `format()`, por lo mismo que en `fechas.ts`. */
function partes(instante: Date): Record<string, string> {
  const resultado: Record<string, string> = {};
  for (const parte of PARTES.formatToParts(instante)) resultado[parte.type] = parte.value;
  return resultado;
}

/**
 * Aritmética de calendario: acá un día son 24 horas siempre, porque todavía no
 * es un instante de la zona sino una casilla del almanaque.
 */
function dia(anio: number, mes: number, numero: number): string {
  return new Date(Date.UTC(anio, mes - 1, numero)).toISOString().slice(0, 10);
}

function numerosDe(diaIso: string): [number, number, number] {
  const [anio, mes, numero] = diaIso.split("-");
  return [Number(anio), Number(mes), Number(numero)];
}

/** El día del local en el que cae un instante: en el servidor son las 00:30 UTC y acá las 21:30 de ayer. */
export function diaLocal(instante: Date = new Date()): string {
  const p = partes(instante);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Un día del almanaque, no cualquier texto con forma de fecha: el 30 de febrero no existe. */
function esDia(valor: string | undefined): valor is string {
  if (!valor || !DIA.test(valor)) return false;
  const [anio, mes, numero] = numerosDe(valor);
  return dia(anio, mes, numero) === valor;
}

/**
 * El instante en que arranca un día del local. El desfasaje se mide contra la
 * zona ese día y no se escribe "-03:00" a mano: Argentina no cambia la hora
 * desde 2009, pero si algún día vuelve a cambiarla, que no se entere por un
 * cierre de caja que no cuadra.
 */
function arranqueDe(diaIso: string): Date {
  const tentativo = new Date(`${diaIso}T00:00:00Z`);
  const p = partes(tentativo);
  const relojDelLocal = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour),
    Number(p.minute),
    Number(p.second),
  );

  return new Date(tentativo.getTime() - (relojDelLocal - tentativo.getTime()));
}

/**
 * El período traducido a los instantes que entiende la base. El cierre es
 * EXCLUSIVO —arranque del día siguiente— para no tener que escribir
 * 23:59:59.999 y dejar afuera una venta registrada en ese último milisegundo.
 */
export function rangoUtc(periodo: Periodo): { desdeIso: string; hastaIso: string } {
  const [anio, mes, numero] = numerosDe(periodo.hasta);

  return {
    desdeIso: arranqueDe(periodo.desde).toISOString(),
    hastaIso: arranqueDe(dia(anio, mes, numero + 1)).toISOString(),
  };
}

export function periodoDeAtajo(atajo: Atajo, ahora: Date = new Date()): Periodo {
  const hoy = diaLocal(ahora);
  if (atajo === "dia") return { desde: hoy, hasta: hoy };
  if (atajo === "mes") return { desde: `${hoy.slice(0, 7)}-01`, hasta: hoy };

  // La semana arranca el lunes, como el almanaque de acá; `getUTCDay` cuenta
  // desde el domingo.
  const [anio, mes, numero] = numerosDe(hoy);
  const diaDeSemana = new Date(Date.UTC(anio, mes - 1, numero)).getUTCDay();
  return { desde: dia(anio, mes, numero - (diaDeSemana === 0 ? 6 : diaDeSemana - 1)), hasta: hoy };
}

/**
 * Lo que vino en la URL, puesto en pie. Un parámetro que falta o está mal
 * escrito no puede dejar la pantalla sin mostrar nada: se completa con hoy.
 */
export function periodoPedido(
  parametros: { desde?: string; hasta?: string },
  ahora: Date = new Date(),
): Periodo {
  const hoy = diaLocal(ahora);
  const desde = esDia(parametros.desde) ? parametros.desde : undefined;
  const hasta = esDia(parametros.hasta) ? parametros.hasta : undefined;
  const periodo = { desde: desde ?? hasta ?? hoy, hasta: hasta ?? hoy };

  // Al revés es un error de tipeo, no un filtro vacío.
  return periodo.desde <= periodo.hasta ? periodo : { desde: periodo.hasta, hasta: periodo.desde };
}

/** "2026-09-28" → "28/09". Ya es un día del local: no hay zona que convertir. */
export function diaCorto(diaIso: string): string {
  const [, mes, numero] = diaIso.split("-");
  return `${numero}/${mes}`;
}
