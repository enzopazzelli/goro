/*
 * El formato de código propio del comercio.
 *
 *   G P 000123 4
 *   │ │ │      └─ dígito verificador
 *   │ │ └──────── secuencia
 *   │ └────────── tipo
 *   └──────────── prefijo del comercio
 *
 * Nada de lo que entra al local viene etiquetado de fábrica, así que todos
 * los códigos son propios y no hay que convivir con formatos ajenos.
 *
 * Regla que sostiene todo el módulo: el código NO transporta información,
 * transporta una identidad. Ni el precio ni el peso van adentro. Así cambiar
 * la lista de precios no convierte en mentira lo ya impreso.
 */

/** Las dos naturalezas de código, que no hay que confundir: */
export const TIPOS = {
  /** Artículo: un tipo de cosa. Uno solo, y dura para siempre. Insumos. */
  A: "articulo",
  /** Unidad: un objeto físico. Se consume al venderlo. Potes armados. */
  P: "pote",
  /** Unidad: una bachada de producción. Trazabilidad del lote. */
  C: "bachada",
} as const;

export type TipoCodigo = keyof typeof TIPOS;

const PREFIJO = "G";
const LARGO_SECUENCIA = 6;
const SECUENCIA_MAXIMA = 10 ** LARGO_SECUENCIA - 1;

/* El tipo entra al cálculo del verificador como un dígito más: si no, GP0001
   y GA0001 compartirían verificador y un error de tipeo en la letra pasaría
   desapercibido. */
const PESO_TIPO: Record<TipoCodigo, number> = { A: 1, P: 2, C: 3 };

export type Codigo = { tipo: TipoCodigo; secuencia: number };

/**
 * Suma ponderada 3/1 módulo 10, el mismo criterio que EAN. No es seguridad:
 * es para que un código tipeado a mano con un dígito cambiado no entre como
 * si fuera otro producto real.
 */
export function digitoVerificador(tipo: TipoCodigo, secuencia: number): number {
  const digitos = [
    PESO_TIPO[tipo],
    ...String(secuencia)
      .padStart(LARGO_SECUENCIA, "0")
      .split("")
      .map((d) => +d),
  ];

  const suma = digitos.reduce((total, digito, i) => total + digito * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (suma % 10)) % 10;
}

/** Arma el código imprimible para un tipo y un número de secuencia. */
export function generarCodigo(tipo: TipoCodigo, secuencia: number): string {
  if (!Number.isInteger(secuencia) || secuencia < 1 || secuencia > SECUENCIA_MAXIMA) {
    throw new Error(`Secuencia fuera de rango (1..${SECUENCIA_MAXIMA}): ${secuencia}`);
  }

  const cuerpo = tipo + String(secuencia).padStart(LARGO_SECUENCIA, "0");
  return PREFIJO + cuerpo + digitoVerificador(tipo, secuencia);
}

/**
 * Lee un código propio. Devuelve `null` si no lo es (un código ajeno, basura
 * de la pistola, o un dígito verificador que no cierra).
 *
 * Que devuelva `null` en vez de tirar excepción es a propósito: el mostrador
 * escanea cualquier cosa, y "no lo conozco" es un caso normal, no un error.
 */
export function leerCodigo(texto: string): Codigo | null {
  const limpio = texto.trim().toUpperCase();
  const partes = new RegExp(`^${PREFIJO}([APC])(\\d{${LARGO_SECUENCIA}})(\\d)$`).exec(limpio);
  if (!partes) return null;

  const tipo = partes[1] as TipoCodigo;
  const secuencia = Number(partes[2]);
  if (secuencia < 1) return null;
  if (Number(partes[3]) !== digitoVerificador(tipo, secuencia)) return null;

  return { tipo, secuencia };
}
