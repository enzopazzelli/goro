/**
 * Una clave al azar con forma de UUID, para que el servidor reconozca un mismo
 * pedido que llega dos veces.
 *
 * `crypto.randomUUID` solo existe en contextos seguros (https o localhost). El
 * mostrador puede abrir el sistema por la IP de la red local, por http, y ahí
 * la función no está: se arma a mano con `getRandomValues`, que sí.
 */
export function nuevaClave(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  // Los bits de versión (4) y de variante (10xx) que exige un UUID v4.
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const FORMA_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Para lo que llega de un formulario: una clave mal formada se descarta, no se manda a la base. */
export function esClaveValida(valor: string): boolean {
  return FORMA_UUID.test(valor);
}
