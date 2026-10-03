import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EtiquetaDePote } from "./EtiquetaDePote";

describe("EtiquetaDePote", () => {
  it("dice a simple vista qué es, cuánto pesó de verdad y cuánto cuesta, y trae el código", () => {
    render(
      <EtiquetaDePote
        pote={{
          id: 1,
          codigo: "GP0000012",
          formatoNombre: "1/4 kilo",
          saborNombre: "Frutilla",
          pesoG: 262,
          precio: 6500,
          armadoEn: "2026-10-04T15:00:00Z",
        }}
      />,
    );

    expect(screen.getByText("1/4 kilo · Frutilla")).toBeTruthy();
    // El peso real de ESTE pote, no el nombre del formato.
    expect(screen.getByText("262 g · $6.500")).toBeTruthy();
    // El código va también impreso en texto: si el lector falla, se tipea.
    expect(screen.getByText("GP0000012")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Código de barras GP0000012" })).toBeTruthy();
  });
});
