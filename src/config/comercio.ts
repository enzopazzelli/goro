/*
 * Todo lo que cambia si el comercio se llama distinto vive acá y en
 * `src/estilos/tema.css` (los colores). Renombrar el negocio tiene que ser
 * tocar estos dos archivos, nunca buscar y reemplazar por todo el código.
 */

/**
 * El nombre que se muestra. PROVISORIO: "Goro" es Gorosito, el dueño — el
 * nombre de la heladería todavía no está definido. Cuando lo diga, se cambia
 * esta línea y listo.
 */
export const NOMBRE_COMERCIO = "Goro";

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
 * Color de la barra del navegador en el celular.
 *
 * Es el único color literal fuera de `tema.css`, y no por descuido: va en una
 * etiqueta `meta` que el navegador lee antes de aplicar cualquier CSS, así que
 * no puede ser una variable. **Tiene que coincidir con `--marco`.**
 */
export const COLOR_NAVEGADOR = "#2a1b12";
