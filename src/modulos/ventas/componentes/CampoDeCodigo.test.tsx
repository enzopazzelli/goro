import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Presentacion } from "@/lib/presentaciones";
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

const PRODUCTOS: Presentacion[] = [
  {
    id: 7,
    insumoId: 2,
    insumoNombre: "Bombón",
    insumoActivo: true,
    nombre: "Docena",
    unidades: 12,
    precio: 5000,
    activo: true,
  },
  {
    id: 8,
    insumoId: 3,
    insumoNombre: "Cucurucho",
    insumoActivo: true,
    nombre: "Unidad",
    unidades: 1,
    precio: 300,
    activo: true,
  },
];

/** Lo que hace la pistola: tipea el código y aprieta Enter. */
async function escanear(codigo: string) {
  const campo = screen.getByLabelText("Código o nombre");
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
    render(
      <CampoDeCodigo presentaciones={PRODUCTOS} yaEnElTicket={() => false} onAgregar={onAgregar} />,
    );

    await escanear("GP0000012");

    await waitFor(() => expect(onAgregar).toHaveBeenCalledWith(POTE));
    expect(buscarPorCodigo).toHaveBeenCalledWith("GP0000012");
    expect(screen.getByText("Agregado: Pote 1/2 kilo · Frutilla")).toBeTruthy();
    expect((screen.getByLabelText("Código o nombre") as HTMLInputElement).value).toBe("");
  });

  it("un código que no se conoce no agrega nada y dice por qué", async () => {
    buscarPorCodigo.mockResolvedValue({ error: "Ese código no está cargado." });
    const onAgregar = vi.fn();
    render(
      <CampoDeCodigo presentaciones={PRODUCTOS} yaEnElTicket={() => false} onAgregar={onAgregar} />,
    );

    await escanear("GP0000999");

    expect(await screen.findByText("Ese código no está cargado.")).toBeTruthy();
    expect(onAgregar).not.toHaveBeenCalled();
  });

  it("un pote que ya está en el ticket no entra dos veces", async () => {
    buscarPorCodigo.mockResolvedValue({ item: POTE });
    const onAgregar = vi.fn();
    render(
      <CampoDeCodigo presentaciones={PRODUCTOS} yaEnElTicket={() => true} onAgregar={onAgregar} />,
    );

    await escanear("GP0000012");

    expect(await screen.findByText("Pote 1/2 kilo · Frutilla ya está en el ticket.")).toBeTruthy();
    expect(onAgregar).not.toHaveBeenCalled();
  });

  it("un nombre ofrece los productos que coinciden y Enter agrega el marcado, sin consultar códigos", async () => {
    const onAgregar = vi.fn();
    render(
      <CampoDeCodigo presentaciones={PRODUCTOS} yaEnElTicket={() => false} onAgregar={onAgregar} />,
    );
    const campo = screen.getByLabelText("Código o nombre") as HTMLInputElement;

    fireEvent.change(campo, { target: { value: "bombon" } });
    expect(screen.getAllByRole("option")).toHaveLength(1);
    fireEvent.keyDown(campo, { key: "Enter" });

    expect(onAgregar).toHaveBeenCalledWith({
      tipo: "producto",
      presentacionId: 7,
      nombre: "Bombón · Docena ×12",
      precio: 5000,
      saboresNombres: [],
    });
    expect(buscarPorCodigo).not.toHaveBeenCalled();
    expect(screen.getByText("Agregado: Bombón · Docena ×12")).toBeTruthy();
    expect(campo.value).toBe("");
  });

  it("un campo vacío no consulta nada", async () => {
    render(
      <CampoDeCodigo presentaciones={PRODUCTOS} yaEnElTicket={() => false} onAgregar={vi.fn()} />,
    );

    await escanear("   ");

    expect(buscarPorCodigo).not.toHaveBeenCalled();
  });
});
