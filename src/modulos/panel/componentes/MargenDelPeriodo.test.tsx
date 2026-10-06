import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MargenDelPeriodo } from "./MargenDelPeriodo";

describe("MargenDelPeriodo", () => {
  it("muestra lo que se tiró en el período, con el enlace al descarte de esas mismas fechas", () => {
    render(
      <MargenDelPeriodo
        vendido={10000}
        costo={{ helado: 3000, insumos: 1000, envases: 0 }}
        descartado={1250}
        periodo={{ desde: "2026-10-01", hasta: "2026-10-06" }}
      />,
    );

    const enlace = screen.getByRole("link", { name: "$1.250" });
    expect(enlace.getAttribute("href")).toBe("/descarte?desde=2026-10-01&hasta=2026-10-06");
  });
});
