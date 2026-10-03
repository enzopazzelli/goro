import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RecibirPorCodigo } from "./RecibirPorCodigo";

vi.mock("../consultas/accionesRecepcion", () => ({ recibirPorCodigo: vi.fn() }));

describe("RecibirPorCodigo", () => {
  it("el Enter de la pistola pasa a la cantidad en vez de mandar el formulario a medias", () => {
    render(<RecibirPorCodigo />);
    const codigo = screen.getByLabelText("Código del artículo");
    const cantidad = screen.getByLabelText("Cuántos llegaron");
    fireEvent.change(codigo, { target: { value: "GA0000014" } });

    const seguiria = fireEvent.keyDown(codigo, { key: "Enter" });

    // `false` = el evento se canceló: el formulario no se envió.
    expect(seguiria).toBe(false);
    expect(document.activeElement).toBe(cantidad);
  });

  it("un Enter con el código vacío no hace nada raro", () => {
    render(<RecibirPorCodigo />);
    const codigo = screen.getByLabelText("Código del artículo");

    expect(fireEvent.keyDown(codigo, { key: "Enter" })).toBe(true);
  });
});
