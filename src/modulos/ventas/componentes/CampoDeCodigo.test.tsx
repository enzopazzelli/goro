import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ItemEnCarrito } from "../tipos";
import { CampoDeCodigo } from "./CampoDeCodigo";

const { buscarPorCodigo } = vi.hoisted(() => ({ buscarPorCodigo: vi.fn() }));
vi.mock("../consultas/porCodigo", () => ({ buscarPorCodigo }));

const POTE: ItemEnCarrito = {
  tipo: "pote",
  poteId: 3,
  nombre: "Pote 1/2 kilo · Frutilla",
  precio: 6500,
  saboresNombres: ["Frutilla"],
};

/** Lo que hace la pistola: tipea el código y aprieta Enter. */
async function escanear(codigo: string) {
  const campo = screen.getByLabelText("Código de barras");
  fireEvent.change(campo, { target: { value: codigo } });
  await act(async () => {
    fireEvent.submit(campo.closest("form")!);
  });
}

describe("CampoDeCodigo", () => {
  beforeEach(() => buscarPorCodigo.mockReset());

  it("un código conocido se agrega al ticket, avisa qué agregó y deja el campo listo para el siguiente", async () => {
    buscarPorCodigo.mockResolvedValue({ item: POTE });
    const onAgregar = vi.fn();
    render(<CampoDeCodigo yaEnElTicket={() => false} onAgregar={onAgregar} />);

    await escanear("GP0000012");

    await waitFor(() => expect(onAgregar).toHaveBeenCalledWith(POTE));
    expect(buscarPorCodigo).toHaveBeenCalledWith("GP0000012");
    expect(screen.getByText("Agregado: Pote 1/2 kilo · Frutilla")).toBeTruthy();
    expect((screen.getByLabelText("Código de barras") as HTMLInputElement).value).toBe("");
  });

  it("un código que no se conoce no agrega nada y dice por qué", async () => {
    buscarPorCodigo.mockResolvedValue({ error: "Ese código no está cargado." });
    const onAgregar = vi.fn();
    render(<CampoDeCodigo yaEnElTicket={() => false} onAgregar={onAgregar} />);

    await escanear("GP0000999");

    expect(await screen.findByText("Ese código no está cargado.")).toBeTruthy();
    expect(onAgregar).not.toHaveBeenCalled();
  });

  it("un pote que ya está en el ticket no entra dos veces", async () => {
    buscarPorCodigo.mockResolvedValue({ item: POTE });
    const onAgregar = vi.fn();
    render(<CampoDeCodigo yaEnElTicket={() => true} onAgregar={onAgregar} />);

    await escanear("GP0000012");

    expect(await screen.findByText("Pote 1/2 kilo · Frutilla ya está en el ticket.")).toBeTruthy();
    expect(onAgregar).not.toHaveBeenCalled();
  });

  it("un campo vacío no consulta nada", async () => {
    render(<CampoDeCodigo yaEnElTicket={() => false} onAgregar={vi.fn()} />);

    await escanear("   ");

    expect(buscarPorCodigo).not.toHaveBeenCalled();
  });
});
