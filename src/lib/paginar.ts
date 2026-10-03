/**
 * PostgREST corta en 1000 filas sin avisar. Un export que lee con un solo
 * `select` sale truncado y nadie se entera: aparecen 1000 ventas de 2991, y el
 * total del mes no cierra. Esto pide página por página hasta que una venga
 * incompleta.
 *
 * Quien lo llama tiene que ordenar por una columna estable (el id): sin orden,
 * una fila puede caer en dos páginas o en ninguna.
 *
 * Un error en cualquier página tira el export entero. Entregar un archivo a
 * medias, sin decir que está a medias, es peor que no entregar nada.
 */
export const TAMANO_DE_PAGINA = 1000;

/** Lo que devuelve un `select(...).range(...)` de Supabase: las filas llegan sin tipo y quien llama dice cuáles son. */
type Pagina = PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>;

export async function leerTodo<Fila>(
  pedir: (desde: number, hasta: number) => Pagina,
): Promise<Fila[]> {
  const todas: Fila[] = [];

  for (let desde = 0; ; desde += TAMANO_DE_PAGINA) {
    const { data, error } = await pedir(desde, desde + TAMANO_DE_PAGINA - 1);
    if (error) throw new Error(`No se pudo leer todo: ${error.message}`);

    const pagina = (data ?? []) as Fila[];
    todas.push(...pagina);
    if (pagina.length < TAMANO_DE_PAGINA) return todas;
  }
}
