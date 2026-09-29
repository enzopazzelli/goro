import { describe, expect, it } from "vitest";
import { itemsParaServidor, saborIdsDe, totalDelCarrito } from "./ticket";
import type { ItemEnCarrito } from "./tipos";

const cucurucho: ItemEnCarrito = {
  tipo: "formato",
  formatoId: 3,
  saborIds: [1, 2],
  nombre: "Cucurucho doble",
  precio: 3000,
  saboresNombres: ["Frutilla", "Limón"],
};

const docena: ItemEnCarrito = {
  tipo: "producto",
  presentacionId: 7,
  nombre: "Bombón · Docena",
  precio: 5000,
  saboresNombres: [],
};

describe("itemsParaServidor", () => {
  it("un formato viaja con sus sabores y sin presentación", () => {
    expect(itemsParaServidor([cucurucho])).toEqual([{ formato_id: 3, sabor_ids: [1, 2] }]);
  });

  it("un producto viaja solo con su presentación", () => {
    expect(itemsParaServidor([docena])).toEqual([{ presentacion_id: 7 }]);
  });

  it("un ticket mezclado conserva el orden y la forma de cada item", () => {
    expect(itemsParaServidor([cucurucho, docena])).toEqual([
      { formato_id: 3, sabor_ids: [1, 2] },
      { presentacion_id: 7 },
    ]);
  });
});

describe("saborIdsDe", () => {
  it("devuelve los sabores de un formato y ninguno de un producto", () => {
    expect(saborIdsDe(cucurucho)).toEqual([1, 2]);
    expect(saborIdsDe(docena)).toEqual([]);
  });
});

describe("totalDelCarrito", () => {
  it("suma formatos y productos juntos", () => {
    expect(totalDelCarrito([cucurucho, docena, docena])).toBe(13000);
  });

  it("un carrito vacío vale cero", () => {
    expect(totalDelCarrito([])).toBe(0);
  });
});
