/**
 * Las funciones de Postgres que exigen un permiso (`tiene_permiso`) avisan con
 * un mensaje que empieza así. Las acciones que normalmente esconden el error de
 * la base detrás de uno genérico lo dejan pasar: si le quitaron el permiso con
 * la pantalla abierta, hay que decirle por qué no anduvo, no "no se pudo".
 */
export function esFaltaDePermiso(error: { message: string }): boolean {
  return error.message.startsWith("No tenés permiso");
}
