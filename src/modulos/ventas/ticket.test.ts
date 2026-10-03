import { describe, expect, it } from "vitest";
import { itemsParaServidor, mismoObjeto, saborIdsDe, totalDelCarrito } from "./ticket";
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

const baldeEntero: ItemEnCarrito = {
  tipo: "balde",
  saborId: 4,
  nombre: "Balde entero · Frutilla",
  precio: 85000,
  saboresNombres: [],
};

describe("itemsParaServidor", () => {
  it("un balde entero viaja solo con su sabor: la base elige cuál de los cerrados", () => {
    expect(itemsParaServidor([baldeEntero])).toEqual([{ balde_sabor_id: 4 }]);
  });

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
    expect(saborIdsDe(baldeEntero)).toEqual([4]);
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

const pote: ItemEnCarrito = {
  tipo: "pote",
  poteId: 12,
  nombre: "Pote 1/2 kilo · Frutilla",
  precio: 6500,
  saboresNombres: ["Frutilla"],
};

describe("items que se escanean", () => {
  it("un pote viaja solo con su id, y un balde puntual con el suyo", () => {
    expect(itemsParaServidor([pote])).toEqual([{ pote_id: 12 }]);
    expect(itemsParaServidor([{ ...baldeEntero, baldeId: 9 }])).toEqual([
      { balde_sabor_id: 4, balde_id: 9 },
    ]);
  });

  it("un pote o un balde puntual no entran dos veces al ticket", () => {
    expect(mismoObjeto(pote, { ...pote })).toBe(true);
    expect(mismoObjeto(pote, { ...pote, poteId: 13 })).toBe(false);
    expect(mismoObjeto({ ...baldeEntero, baldeId: 9 }, { ...baldeEntero, baldeId: 9 })).toBe(true);
  });

  it('un balde "del sabor" y un cucurucho se pueden repetir: no son un objeto puntual', () => {
    expect(mismoObjeto(baldeEntero, baldeEntero)).toBe(false);
    expect(mismoObjeto(cucurucho, cucurucho)).toBe(false);
  });
});
