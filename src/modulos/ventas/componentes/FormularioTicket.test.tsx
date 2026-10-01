import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Presentacion } from "@/lib/presentaciones";
import { FormularioTicket } from "./FormularioTicket";

// La acción real devuelve SIEMPRE el mismo objeto de éxito: la segunda venta
// tiene que vaciar el carrito igual, aunque el estado que devuelve no cambie.
const { registrarVenta } = vi.hoisted(() => {
  const EXITO: { error: string | null } = { error: null };
  return { registrarVenta: vi.fn(async () => EXITO) };
});

vi.mock("../consultas/acciones", () => ({ registrarVenta }));
vi.mock("@/lib/accionesCaja", () => ({ abrirCaja: vi.fn() }));
vi.mock("@/lib/accionesBaldes", () => ({ abrirBalde: vi.fn() }));

const bombon: Presentacion = {
  id: 1,
  insumoId: 1,
  insumoNombre: "Bombón",
  insumoActivo: true,
  nombre: "Docena",
  unidades: 12,
  precio: 5000,
  activo: true,
};

function montar() {
  render(
    <FormularioTicket
      formatos={[]}
      sabores={[]}
      baldes={[]}
      presentaciones={[bombon]}
      cajaAbierta
    />,
  );
}

// `^`: el carrito también tiene un botón "Quitar Bombón…".
const agregarBombon = () => fireEvent.click(screen.getByRole("button", { name: /^Bombón/ }));

async function cobrar() {
  const formulario = screen.getByRole("button", { name: "Cobrar" }).closest("form")!;
  await act(async () => {
    fireEvent.submit(formulario);
  });
}

describe("FormularioTicket: después de cobrar", () => {
  it("el carrito queda vacío sin tocar nada, con un aviso de lo cobrado", async () => {
    montar();
    agregarBombon();
    agregarBombon();
    expect(screen.getByText("2 ítems")).toBeTruthy();

    await cobrar();

    await waitFor(() => expect(screen.getByText("0 ítems")).toBeTruthy());
    expect(screen.getByRole("status").textContent).toBe("Cobrado: $10.000 · Efectivo");
    // Ya no hay un paso intermedio que cerrar a mano.
    expect(screen.queryByRole("button", { name: "Nueva venta" })).toBeNull();
    expect(screen.getByRole("button", { name: "Cobrar" })).toBeTruthy();
  });

  it("el aviso se va solo al agregar el primer ítem de la venta siguiente", async () => {
    montar();
    agregarBombon();
    await cobrar();
    await waitFor(() => expect(screen.getByRole("status")).toBeTruthy());

    agregarBombon();

    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByText("1 ítem")).toBeTruthy();
  });

  it("la segunda venta también vacía el carrito y avisa su propio total", async () => {
    montar();
    agregarBombon();
    await cobrar();
    await waitFor(() => expect(screen.getByText("0 ítems")).toBeTruthy());

    agregarBombon();
    agregarBombon();
    agregarBombon();
    await cobrar();

    await waitFor(() => expect(screen.getByText("0 ítems")).toBeTruthy());
    expect(screen.getByRole("status").textContent).toBe("Cobrado: $15.000 · Efectivo");
  });

  it("si el cobro falla, el carrito no se toca", async () => {
    registrarVenta.mockResolvedValueOnce({ error: "La caja está cerrada." });
    montar();
    agregarBombon();

    await cobrar();

    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(screen.getByText("1 ítem")).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
  });
});
