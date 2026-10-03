import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Presentacion } from "@/lib/presentaciones";
import type { Cobrado } from "../tipos";
import { FormularioTicket } from "./FormularioTicket";

// Devuelve SIEMPRE el mismo objeto: es el caso que rompía cuando el carrito se
// vaciaba comparando el estado anterior con el nuevo durante el render.
const { registrarVenta } = vi.hoisted(() => {
  const EXITO = {
    error: null as string | null,
    cobrado: { ventaId: 12, total: 10000, medioPago: "efectivo" } as Cobrado | null,
  };
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
      precioBaldeDefault={null}
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

const aviso = () => screen.getByRole("status").textContent;

const claveDeLaLlamada = (indice: number) => {
  const llamada = registrarVenta.mock.calls[indice] as unknown as [unknown, FormData];
  return String(llamada[1].get("clave"));
};

describe("FormularioTicket: un cobro no se registra dos veces", () => {
  it("reintentar después de perder la respuesta manda la MISMA clave, y el carrito sigue ahí", async () => {
    registrarVenta.mockClear();
    registrarVenta.mockRejectedValueOnce(new Error("se cortó"));
    montar();
    agregarBombon();

    await cobrar();
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Tocá Cobrar"));
    expect(screen.getByText("1 ítem")).toBeTruthy();
    await cobrar();

    const primera = claveDeLaLlamada(0);
    expect(primera).toMatch(/^[0-9a-f-]{36}$/);
    expect(claveDeLaLlamada(1)).toBe(primera);
  });

  it("si el ticket cambia, la clave cambia: no se le devuelve a otro pedido la venta de uno anterior", async () => {
    registrarVenta.mockClear();
    registrarVenta.mockRejectedValueOnce(new Error("se cortó"));
    registrarVenta.mockRejectedValueOnce(new Error("se cortó"));
    montar();
    agregarBombon();
    await cobrar();

    agregarBombon();
    await cobrar();

    expect(claveDeLaLlamada(1)).not.toBe(claveDeLaLlamada(0));
  });
});

describe("FormularioTicket: después de cobrar", () => {
  it("el lugar del aviso existe desde antes de cobrar", () => {
    montar();

    // La región viva tiene que estar en el DOM de entrada: un lector de
    // pantalla no anuncia lo que aparece junto con su propio contenedor.
    expect(aviso()).toBe("");
  });

  it("el carrito queda vacío sin tocar nada, con un aviso de lo cobrado", async () => {
    montar();
    agregarBombon();
    agregarBombon();
    expect(screen.getByText("2 ítems")).toBeTruthy();

    await cobrar();

    await waitFor(() => expect(screen.getByText("0 ítems")).toBeTruthy());
    expect(aviso()).toBe("Cobrado: $10.000 · Efectivo · #12");
    // Ya no hay un paso intermedio que cerrar a mano.
    expect(screen.queryByRole("button", { name: "Nueva venta" })).toBeNull();
    expect(screen.getByRole("button", { name: "Cobrar" })).toBeTruthy();
  });

  it("el aviso dice el total que registró el servidor, no el que suma el carrito", async () => {
    registrarVenta.mockResolvedValueOnce({
      error: null,
      cobrado: { ventaId: 7, total: 4500, medioPago: "efectivo" },
    });
    montar();
    agregarBombon(); // $5.000 en la pantalla

    await cobrar();

    await waitFor(() => expect(aviso()).toBe("Cobrado: $4.500 · Efectivo · #7"));
  });

  it("si la venta entró pero no se pudo leer el total, el aviso igual sale", async () => {
    registrarVenta.mockResolvedValueOnce({
      error: null,
      cobrado: { ventaId: 9, total: null, medioPago: "efectivo" },
    });
    montar();
    agregarBombon();

    await cobrar();

    await waitFor(() => expect(aviso()).toBe("Cobrado · Efectivo · #9"));
  });

  it("el aviso se va solo al agregar el primer ítem de la venta siguiente", async () => {
    montar();
    agregarBombon();
    await cobrar();
    await waitFor(() => expect(aviso()).not.toBe(""));

    agregarBombon();

    expect(aviso()).toBe("");
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
    expect(aviso()).toBe("Cobrado: $10.000 · Efectivo · #12");
  });

  it("el aviso vuelve si se agrega un ítem y se lo quita", async () => {
    montar();
    agregarBombon();
    await cobrar();
    await waitFor(() => expect(aviso()).not.toBe(""));

    agregarBombon();
    fireEvent.click(screen.getByRole("button", { name: /^Quitar/ }));

    // Un toque por error no borra la constancia de que la venta anterior entró.
    expect(aviso()).toBe("Cobrado: $10.000 · Efectivo · #12");
  });

  it("si el cobro falla, el carrito no se toca", async () => {
    // Sin `cajaCerrada`: con la caja abierta, ese error lo tapa el carrito.
    registrarVenta.mockResolvedValueOnce({
      error: "No hay un balde abierto de Frutilla.",
      cobrado: null,
    });
    montar();
    agregarBombon();

    await cobrar();

    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(screen.getByText("1 ítem")).toBeTruthy();
    expect(aviso()).toBe("");
  });
});
