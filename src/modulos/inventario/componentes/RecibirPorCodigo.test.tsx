import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Insumo } from "../tipos";
import { RecibirPorCodigo } from "./RecibirPorCodigo";

vi.mock("../consultas/accionesRecepcion", () => ({ recibirPorCodigo: vi.fn() }));

const INSUMOS: Insumo[] = [
  {
    id: 4,
    nombre: "Cucurucho",
    codigo: "GA0000014",
    unidad: "u",
    tipo: "envase",
    formatoId: 1,
    cantidad: 40,
    minimo: 10,
    costo: 300,
    activo: true,
  },
];

describe("RecibirPorCodigo", () => {
  it("el Enter de la pistola pasa a la cantidad en vez de mandar el formulario a medias", () => {
    render(<RecibirPorCodigo insumos={INSUMOS} />);
    const codigo = screen.getByLabelText("Código o nombre");
    const cantidad = screen.getByLabelText("Cuántos llegaron");
    fireEvent.change(codigo, { target: { value: "GA0000014" } });

    const seguiria = fireEvent.keyDown(codigo, { key: "Enter" });

    // `false` = el evento se canceló: el formulario no se envió.
    expect(seguiria).toBe(false);
    expect(document.activeElement).toBe(cantidad);
  });

  it("un Enter con el código vacío no hace nada raro", () => {
    render(<RecibirPorCodigo insumos={INSUMOS} />);
    const codigo = screen.getByLabelText("Código o nombre");

    expect(fireEvent.keyDown(codigo, { key: "Enter" })).toBe(true);
  });

  it("buscar por nombre deja el código del insumo y pasa a la cantidad", () => {
    render(<RecibirPorCodigo insumos={INSUMOS} />);
    const codigo = screen.getByLabelText("Código o nombre") as HTMLInputElement;

    fireEvent.change(codigo, { target: { value: "cucurucho" } });
    fireEvent.keyDown(codigo, { key: "Enter" });

    expect(codigo.value).toBe("GA0000014");
    expect(document.activeElement).toBe(screen.getByLabelText("Cuántos llegaron"));
  });
});
