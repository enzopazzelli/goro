import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Descarte } from "../tipos";
import { ListaDeHoy } from "./ListaDeHoy";

const DESCARTE: Descarte = {
  id: 1,
  tipo: "insumo",
  que: "Cucurucho",
  grupo: "insumo:3:u",
  cantidad: 2,
  unidad: "u",
  motivo: "roto",
  nota: "se cayó la caja",
  costo: 600,
  creadoPor: "u1",
  creadoEn: "2026-10-06T15:00:00Z",
};

describe("ListaDeHoy", () => {
  it("el colaborador ve qué se tiró, pero no el costo ni quién lo cargó", () => {
    render(<ListaDeHoy descartes={[DESCARTE]} nombres={null} />);

    expect(screen.getByText("Cucurucho")).toBeTruthy();
    expect(screen.getByText("2 u")).toBeTruthy();
    expect(screen.queryByText("$600")).toBeNull();
    expect(screen.queryByRole("columnheader", { name: "Cargó" })).toBeNull();
  });

  it("el dueño ve además el costo y quién lo cargó", () => {
    render(<ListaDeHoy descartes={[DESCARTE]} nombres={new Map([["u1", "Lucía"]])} />);

    expect(screen.getByText("$600")).toBeTruthy();
    expect(screen.getByText("Lucía")).toBeTruthy();
  });

  it("sin descartes lo dice, en vez de una tabla vacía", () => {
    render(<ListaDeHoy descartes={[]} nombres={null} />);
    expect(screen.getByText("Hoy no se descartó nada.")).toBeTruthy();
  });
});
