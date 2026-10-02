/**
 * Un parámetro de la URL repetido (`?medio=a&medio=b`) llega como lista: vale
 * el primero. Lo usan las pantallas que filtran por `searchParams`.
 */
export function unParametro(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}
