import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Balde } from "@/lib/baldes";
import type { Sabor } from "@/lib/sabores";
import { SelectorDeBaldes } from "./SelectorDeBaldes";

const frutilla: Sabor = {
  id: 1,
  nombre: "Frutilla",
  activo: true,
  stockMinimo: null,
  precioBalde: null,
  color: "#cc0000",
};

function balde(cambios: Partial<Balde>): Balde {
  return {
    id: 1,
    codigo: "GB0000001",
    saborId: 1,
    kgInicial: 10,
    kgRestante: 10,
    estado: "cerrado",
    costo: 40000,
    costoEnvase: 9000,
    ...cambios,
  };
}

describe("SelectorDeBaldes", () => {
  it("ofrece el balde cerrado al precio del comercio y lo agrega al ticket", () => {
    const onAgregar = vi.fn();
    render(
      <SelectorDeBaldes
        sabores={[frutilla]}
        baldes={[balde({})]}
        precioPorDefecto={85000}
        onAgregar={onAgregar}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Frutilla/ }));

    expect(onAgregar).toHaveBeenCalledWith({
      tipo: "balde",
      saborId: 1,
      nombre: "Balde entero · Frutilla",
      precio: 85000,
      saboresNombres: ["Frutilla"],
    });
  });

  it("el precio propio del sabor pisa el del comercio", () => {
    render(
      <SelectorDeBaldes
        sabores={[{ ...frutilla, precioBalde: 90000 }]}
        baldes={[balde({})]}
        precioPorDefecto={85000}
        onAgregar={() => {}}
      />,
    );

    expect(screen.getByText("$90.000")).toBeTruthy();
  });

  it("sin precio no se puede agregar: se dice por qué en vez de fallar al cobrar", () => {
    render(
      <SelectorDeBaldes
        sabores={[frutilla]}
        baldes={[balde({})]}
        precioPorDefecto={null}
        onAgregar={() => {}}
      />,
    );

    const boton = screen.getByRole("button", { name: /Frutilla/ }) as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
    expect(screen.getByText("Sin precio")).toBeTruthy();
  });

  it("un sabor con el balde abierto y ninguno cerrado no se ofrece", () => {
    render(
      <SelectorDeBaldes
        sabores={[frutilla]}
        baldes={[balde({ estado: "abierto", kgRestante: 4 })]}
        precioPorDefecto={85000}
        onAgregar={() => {}}
      />,
    );

    expect(screen.queryByRole("button")).toBeNull();
  });

  it("cuenta cuántos baldes cerrados hay", () => {
    render(
      <SelectorDeBaldes
        sabores={[frutilla]}
        baldes={[balde({ id: 1 }), balde({ id: 2 })]}
        precioPorDefecto={85000}
        onAgregar={() => {}}
      />,
    );

    expect(screen.getByText("2 cerrados")).toBeTruthy();
  });
});
