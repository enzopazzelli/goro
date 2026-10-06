import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ArticuloDescartable } from "../tipos";
import { FormularioDescarte } from "./FormularioDescarte";

const { descartarArticulo } = vi.hoisted(() => ({ descartarArticulo: vi.fn() }));
vi.mock("../consultas/acciones", () => ({ descartarArticulo }));

const ARTICULOS: ArticuloDescartable[] = [
  { id: 1, nombre: "Cucurucho", unidad: "u", tipo: "envase", cantidad: 40 },
];
const FORMA_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const clavesEnviadas = () =>
  descartarArticulo.mock.calls.map(([, datos]) => (datos as FormData).get("clave"));

async function tocarDescartar() {
  const formulario = screen.getByRole("button", { name: "Descartar" }).closest("form")!;
  await act(async () => {
    fireEvent.submit(formulario);
  });
}

describe("FormularioDescarte", () => {
  afterEach(() => descartarArticulo.mockReset());

  it("el Enter de la pistola en el código pasa a la cantidad en vez de mandar el formulario", () => {
    render(<FormularioDescarte articulos={ARTICULOS} />);
    const codigo = screen.getByLabelText("Código");

    fireEvent.change(codigo, { target: { value: "GA0000001" } });
    fireEvent.keyDown(codigo, { key: "Enter" });

    expect(document.activeElement).toBe(screen.getByLabelText("Cantidad"));
    expect(descartarArticulo).not.toHaveBeenCalled();
  });

  it("reintentar sin cambiar nada manda la misma clave; el descarte siguiente lleva otra", async () => {
    descartarArticulo
      .mockResolvedValueOnce({ error: "No llegó la respuesta." })
      .mockResolvedValue({ error: null, aviso: "Se descartó 2 de Cucurucho." });
    render(<FormularioDescarte articulos={ARTICULOS} />);

    fireEvent.change(screen.getByLabelText("Cantidad"), { target: { value: "2" } });
    await tocarDescartar();
    await tocarDescartar();
    fireEvent.change(screen.getByLabelText("Cantidad"), { target: { value: "3" } });
    await tocarDescartar();

    const [primera, reintento, siguiente] = clavesEnviadas();
    expect(primera).toMatch(FORMA_UUID);
    expect(reintento).toBe(primera);
    expect(siguiente).toMatch(FORMA_UUID);
    expect(siguiente).not.toBe(primera);
  });
});
