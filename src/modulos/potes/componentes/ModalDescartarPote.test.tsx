import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PoteEnFreezer } from "../tipos";
import { ModalDescartarPote } from "./ModalDescartarPote";

const { descartarPote } = vi.hoisted(() => ({
  descartarPote: vi.fn<(previo: unknown, datos: FormData) => Promise<{ error: null }>>(
    async () => ({ error: null }),
  ),
}));
vi.mock("../consultas/acciones", () => ({ descartarPote }));

const POTE: PoteEnFreezer = {
  id: 5,
  codigo: "GP0000005",
  formatoNombre: "1/4 kg",
  saborNombre: "Frutilla",
  pesoG: 262,
  precio: 3000,
  armadoEn: "2026-10-06T15:00:00Z",
};

describe("ModalDescartarPote", () => {
  it("manda el motivo elegido y se cierra", async () => {
    const onCerrar = vi.fn();
    render(<ModalDescartarPote abierto onCerrar={onCerrar} pote={POTE} />);

    fireEvent.change(screen.getByLabelText("Por qué"), { target: { value: "roto" } });
    await act(async () => {
      fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);
    });

    const datos = descartarPote.mock.calls[0]![1];
    expect(datos.get("poteId")).toBe("5");
    expect(datos.get("motivo")).toBe("roto");
    expect(onCerrar).toHaveBeenCalled();
  });

  it("no ofrece 'resto de balde': un pote no lo es", () => {
    render(<ModalDescartarPote abierto onCerrar={vi.fn()} pote={POTE} />);
    expect(screen.queryByRole("option", { name: "Resto de balde" })).toBeNull();
  });
});
