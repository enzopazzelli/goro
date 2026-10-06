/** Algo que se puede encontrar escribiendo su nombre. */
export type OpcionDeBusqueda = { clave: string; nombre: string; detalle?: string };

/** "Bombón" y "bombon" son lo mismo para quien tipea apurado en el mostrador. */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/**
 * Las primeras letras de un código del sistema (G + tipo + número). Mientras la
 * pistola tipea "GA00…" no hay que sugerir "Galletita".
 */
export function pareceCodigo(texto: string): boolean {
  return /^g[a-z]\d/i.test(texto.trim());
}

/**
 * Lo que coincide con lo escrito: cada palabra tiene que estar en el nombre, en
 * cualquier orden ("12 bom" encuentra "Bombón ×12"). Primero lo que empieza
 * con lo escrito, que es lo que se busca casi siempre.
 */
export function coincidencias<T extends OpcionDeBusqueda>(
  opciones: T[],
  texto: string,
  tope = 6,
): T[] {
  const buscado = normalizar(texto);
  if (buscado.length < 2) return [];
  const palabras = buscado.split(/\s+/);

  const encontradas = opciones
    .map((opcion) => ({ opcion, nombre: normalizar(opcion.nombre) }))
    .filter(({ nombre }) => palabras.every((palabra) => nombre.includes(palabra)));
  const empiezan = encontradas.filter(({ nombre }) => nombre.startsWith(buscado));
  const contienen = encontradas.filter(({ nombre }) => !nombre.startsWith(buscado));

  return [...empiezan, ...contienen].slice(0, tope).map(({ opcion }) => opcion);
}
