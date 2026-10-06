import { describe, expect, it } from "vitest";
import { libroDeDescarte } from "./libroDeDescarte";
import type { Descarte } from "./tipos";

const BASE: Descarte = {
  id: 1,
  tipo: "insumo",
  que: "Cucurucho",
  grupo: "insumo:3:u",
  cantidad: 2,
  unidad: "u",
  motivo: "roto",
  nota: null,
  costo: 600,
  creadoPor: "u1",
  creadoEn: "2026-10-06T15:00:00Z",
};

describe("libroDeDescarte", () => {
  it("una nota o un nombre que empiezan como fórmula salen como texto", () => {
    const libro = libroDeDescarte(
      [{ ...BASE, que: "+Frutilla", nota: "=HIPERVINCULO(1)" }],
      new Map([["u1", "@Enzo"]]),
    );
    const [fila] = libro.hojas[0]!.filas;

    expect(fila![1]).toEqual({ value: "'+Frutilla", type: String });
    expect(fila![6]).toEqual({ value: "'=HIPERVINCULO(1)", type: String });
    expect(fila![8]).toEqual({ value: "'@Enzo", type: String });
  });

  it("los kilos salen con decimales y las unidades enteras", () => {
    const libro = libroDeDescarte(
      [BASE, { ...BASE, tipo: "balde", unidad: "kg", cantidad: 0.4, motivo: "resto_de_balde" }],
      new Map(),
    );
    const [unidades, kilos] = libro.hojas[0]!.filas;

    expect(unidades![3]).toEqual({ value: 2, type: Number });
    expect(kilos![3]).toEqual({ value: 0.4, type: Number, format: "#,##0.00" });
    expect(kilos![5]).toEqual({ value: "Resto de balde", type: String });
  });
});
