/*
 * Code 128, subconjunto B (ASCII 32..126).
 *
 * Por qué escrito a mano y no una librería: son ~60 líneas, no cambia nunca
 * (la norma es de 1981) y evita arrastrar una dependencia al bundle del
 * mostrador. Además deja el algoritmo a la vista para poder testearlo, que es
 * lo único que puede atajar un error de transcripción en la tabla de abajo.
 *
 * Por qué Code 128 y no EAN-13: es alfanumérico, denso y no necesita comprar
 * un prefijo a GS1 — nada de lo que se etiqueta acá sale del local. Si la
 * pistola de Goro resultara no leerlo (paso 0.2 del ROADMAP), se cambia este
 * archivo y nada más: el código es una identidad, no lleva datos adentro.
 */

/* Tabla de la norma: los anchos, en módulos, de los 6 elementos de cada
   patrón, alternando barra/espacio y empezando SIEMPRE por barra. Los índices
   0..102 son datos, 103..105 arranques, 106 parada (7 elementos). */
// prettier-ignore
const PATRONES = [
  "212222","222122","222221","121223","121322","131222","122213","122312","132212","221213",
  "221312","231212","112232","122132","122231","113222","123122","123221","223211","221132",
  "221231","213212","223112","312131","311222","321122","321221","312212","322112","322211",
  "212123","212321","232121","111323","131123","131321","112313","132113","132311","211313",
  "231113","231311","112133","112331","132131","113123","113321","133121","313121","211331",
  "231131","213113","213311","213131","311123","311321","331121","312113","312311","332111",
  "314111","221411","431111","111224","111422","121124","121421","141122","141221","112214",
  "112412","122114","122411","142112","142211","241211","221114","413111","241112","134111",
  "111242","121142","121241","114212","124112","124211","411212","421112","421211","212141",
  "214121","412121","111143","111341","131141","114113","114311","411113","411311","113141",
  "114131","311141","411131","211412","211214","211232","2331112",
] as const;

const ARRANQUE_B = 104;
const PARADA = 106;

/** Módulos en blanco a cada lado. Sin esto la pistola no engancha el código. */
export const ZONA_MUDA = 10;

export type Barra = { x: number; ancho: number };

/** Una barra o un espacio del patrón, con su posición en módulos. */
function patron(valor: number): string {
  const p = PATRONES[valor];
  if (p === undefined) throw new Error(`Valor Code 128 fuera de tabla: ${valor}`);
  return p;
}

/**
 * Los valores del subconjunto B para un texto: arranque, datos, verificador y
 * parada. El verificador es la suma del arranque más cada dato por su
 * posición (empezando en 1), módulo 103.
 */
export function valoresDe(texto: string): number[] {
  const datos = [...texto].map((caracter) => {
    const valor = caracter.charCodeAt(0) - 32;
    if (valor < 0 || valor > 94) {
      throw new Error(`Code 128B no puede codificar ${JSON.stringify(caracter)}`);
    }
    return valor;
  });

  const suma = datos.reduce((total, valor, indice) => total + valor * (indice + 1), ARRANQUE_B);
  return [ARRANQUE_B, ...datos, suma % 103, PARADA];
}

/** Los patrones concatenados como cadena de módulos: "1" barra, "0" espacio. */
function modulosDe(texto: string): string {
  return valoresDe(texto)
    .map(patron)
    .flatMap((p) => [...p].map((ancho, indice) => (indice % 2 === 0 ? "1" : "0").repeat(+ancho)))
    .join("");
}

/**
 * Las barras negras a dibujar, ya desplazadas por la zona muda. Se devuelven
 * agrupadas (una barra de 3 módulos es un rectángulo, no tres) para que el
 * SVG salga con la menor cantidad de nodos posible.
 */
export function barrasDe(texto: string): Barra[] {
  const modulos = modulosDe(texto);
  const barras: Barra[] = [];

  for (let i = 0; i < modulos.length;) {
    let fin = i;
    while (fin < modulos.length && modulos[fin] === modulos[i]) fin++;
    if (modulos[i] === "1") barras.push({ x: ZONA_MUDA + i, ancho: fin - i });
    i = fin;
  }

  return barras;
}

/** Ancho total del dibujo, en módulos, contando las dos zonas mudas. */
export function anchoEnModulos(texto: string): number {
  return modulosDe(texto).length + ZONA_MUDA * 2;
}

/* Solo para los tests: dejar decodificar permite verificar que la tabla es
   inequívoca y que el codificador es reversible. No se usa en la app. */
export const soloParaTests: {
  PATRONES: readonly string[];
  modulosDe: (texto: string) => string;
  ARRANQUE_B: number;
  PARADA: number;
} = { PATRONES, modulosDe, ARRANQUE_B, PARADA };
