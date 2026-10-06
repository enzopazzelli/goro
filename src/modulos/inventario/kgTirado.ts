/**
 * Lo que se tiró al terminar un balde. Vacío es "no se tiró nada", no un
 * error: es lo más común, y obligar a tipear un 0 es un paso más en el mostrador.
 */
export function leerKgTirado(valor: FormDataEntryValue | null): { kg: number } | { error: string } {
  const texto = typeof valor === "string" ? valor.trim() : "";
  if (texto === "") return { kg: 0 };

  const kg = Number(texto);
  if (!Number.isFinite(kg) || kg < 0) {
    return { error: "Lo que se tiró tiene que ser un número de kilos, 0 o más." };
  }
  return { kg };
}
