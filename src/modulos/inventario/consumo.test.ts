import { describe, expect, it } from "vitest";
import { insumosParaConsumo } from "./consumo";
import type { Insumo } from "./tipos";

function insumo(datos: Partial<Insumo>): Insumo {
  return {
    id: 1,
    nombre: "Cono doble",
    codigo: "GA0000038",
    unidad: "u",
    cantidad: 0,
    minimo: 0,
    costo: 0,
    activo: true,
    esComponente: true,
    ...datos,
  };
}

describe("insumosParaConsumo", () => {
  it("ofrece solo los insumos marcados como componentes de un formato", () => {
    const cono = insumo({ id: 1, nombre: "Cono doble" });
    const bombon = insumo({ id: 2, nombre: "Bombón", esComponente: false });
    expect(insumosParaConsumo([cono, bombon])).toEqual([cono]);
  });

  it("deja afuera los desactivados", () => {
    expect(insumosParaConsumo([insumo({ activo: false })])).toEqual([]);
  });

  it("deja afuera los que no se cuentan por unidad: un formato consume '1 cono', no '0,3 kg'", () => {
    expect(insumosParaConsumo([insumo({ unidad: "kg" })])).toEqual([]);
  });

  it("sin ningún componente marcado la lista queda vacía", () => {
    expect(insumosParaConsumo([insumo({ esComponente: false })])).toEqual([]);
  });
});
