/*
 * Todo lo que cambia si el comercio se llama distinto vive acá y en
 * `src/estilos/tema.css` (los colores). Renombrar el negocio tiene que ser
 * tocar estos dos archivos, nunca buscar y reemplazar por todo el código.
 *
 * PONERLE NOMBRE AL COMERCIO — la lista completa:
 *   1. `NOMBRE_COMERCIO` y `RUBRO_COMERCIO`, acá abajo. De ahí salen solos el
 *      menú, el ingreso, el título de la pestaña, la descripción del sitio y el
 *      nombre de los archivos de Excel (`<nombre>-ventas-2026-10-04.xlsx`).
 *   2. `docs/guia-de-uso.html`: el bloque `COMERCIO` al final del archivo.
 *   3. Si hay logo o fondo propio: `public/` (el fondo del ingreso es
 *      `fondo-login-escritorio.svg`).
 *
 * LO QUE NO SE TOCA, a propósito:
 *   - `DOMINIO_INTERNO` (abajo): queda grabado en cada cuenta.
 *   - El prefijo `G` de los códigos de barras (`src/lib/codigos/codigo.ts`): es
 *     una marca técnica, no el nombre. Está en el `check` de las columnas de
 *     código de la base y en todas las etiquetas ya impresas: cambiarlo obliga
 *     a una migración y a reimprimir todo.
 *   - El nombre de la carpeta, del repositorio y del paquete (`goro`): es el
 *     nombre interno del proyecto, no se muestra en ninguna pantalla.
 *
 * "Goro" a secas, en el código, es el dueño como persona; en las pantallas se
 * lo llama "el dueño", para que el texto no dependa de quién lo sea.
 */

/** El nombre que se muestra. PROVISORIO: todavía no está definido el de la heladería. */
export const NOMBRE_COMERCIO = "Goro";

/** La leyenda que va debajo del nombre en el menú. */
export const RUBRO_COMERCIO = "Heladería artesanal";

/** La descripción que ven los buscadores y al compartir el enlace del sitio. */
export const DESCRIPCION_DEL_SISTEMA = `Sistema de gestión de ${NOMBRE_COMERCIO}.`;

/**
 * Dominio de los correos internos que Supabase Auth exige para crear una
 * cuenta (ver `src/modulos/auth/usuario.ts`). Nadie lo lee ni lo ve.
 *
 * A propósito NO lleva el nombre del comercio: este valor queda grabado en el
 * email de cada fila de `auth.users`, así que cambiarlo después obliga a
 * migrar todas las cuentas. Es genérico para que el día que se defina el
 * nombre real, no haya que tocar nada.
 *
 * `.local` porque por RFC 6762 nunca va a ser un dominio de verdad: no puede
 * chocar con el correo real de nadie.
 */
export const DOMINIO_INTERNO = "heladeria.local";

/**
 * Las horas se muestran en la del local, no en la del servidor: en el hosting
 * el servidor corre en UTC, y un turno abierto a las 14:30 diría 17:30.
 */
export const ZONA_HORARIA = "America/Argentina/Buenos_Aires";

/**
 * Color de la barra del navegador en el celular.
 *
 * Es el único color literal fuera de `tema.css`, y no por descuido: va en una
 * etiqueta `meta` que el navegador lee antes de aplicar cualquier CSS, así que
 * no puede ser una variable. **Tiene que coincidir con `--marco`.**
 */
export const COLOR_NAVEGADOR = "#2a1b12";
