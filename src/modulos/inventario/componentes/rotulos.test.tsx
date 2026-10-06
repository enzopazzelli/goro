import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { BotonAjustarBalde } from "./BotonAjustarBalde";
import { FormularioMinimo } from "./FormularioMinimo";
import { FormularioPrecioBalde } from "./FormularioPrecioBalde";

vi.mock("../consultas/accionesSabores", () => ({
  editarStockMinimo: vi.fn(),
  editarPrecioBalde: vi.fn(),
}));
vi.mock("../consultas/acciones", () => ({ registrarAjusteBalde: vi.fn() }));

// Goro vio dos casilleros que solo decían "default" adentro y no supo qué iba
// en cada uno: el rótulo tiene que leerse a la vista, no solo existir para un
// lector de pantalla.
describe.each<[string, () => ReactNode, string, string]>([
  [
    "FormularioMinimo",
    () => <FormularioMinimo saborId={1} valorActual={null} />,
    "Mínimo (kg)",
    "stockMinimo",
  ],
  [
    "FormularioPrecioBalde",
    () => <FormularioPrecioBalde saborId={1} valorActual={null} />,
    "Precio balde entero ($)",
    "precioBalde",
  ],
  ["BotonAjustarBalde", () => <BotonAjustarBalde baldeId={1} />, "Ajuste (± kg)", "kg"],
])("%s", (_nombre, dibujar, rotulo, campo) => {
  it("muestra a la vista qué va en el casillero", () => {
    render(dibujar());
    expect(screen.getByText(rotulo)).toBeTruthy();
    expect(screen.getByLabelText(rotulo).getAttribute("name")).toBe(campo);
  });
});
