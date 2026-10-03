import { describe, expect, it } from "vitest";
import { leerTodo, TAMANO_DE_PAGINA } from "./paginar";

/** Una tabla falsa de `total` filas, que responde como `.range(desde, hasta)`. */
function tabla(total: number) {
  const pedidos: Array<[number, number]> = [];
  const pedir = async (desde: number, hasta: number) => {
    pedidos.push([desde, hasta]);
    const filas = Array.from({ length: total }, (_, i) => i).slice(desde, hasta + 1);
    return { data: filas, error: null };
  };
  return { pedir, pedidos };
}

describe("leerTodo", () => {
  it("trae más de mil filas, que es donde PostgREST corta en silencio", async () => {
    const { pedir, pedidos } = tabla(2991);

    const filas = await leerTodo(pedir);

    expect(filas).toHaveLength(2991);
    expect(filas[2990]).toBe(2990);
    expect(pedidos).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it("con una cantidad exacta de páginas pide una más para confirmar que no hay otra", async () => {
    const { pedir, pedidos } = tabla(TAMANO_DE_PAGINA);

    expect(await leerTodo(pedir)).toHaveLength(TAMANO_DE_PAGINA);
    expect(pedidos).toHaveLength(2);
  });

  it("una tabla vacía es una lista vacía", async () => {
    expect(await leerTodo(tabla(0).pedir)).toEqual([]);
  });

  it("si una página falla, falla todo: no se entrega un archivo a medias", async () => {
    const pedir = async (desde: number) =>
      desde === 0
        ? { data: Array.from({ length: TAMANO_DE_PAGINA }, (_, i) => i), error: null }
        : { data: null, error: { message: "se cortó la conexión" } };

    await expect(leerTodo(pedir)).rejects.toThrow("se cortó la conexión");
  });
});
