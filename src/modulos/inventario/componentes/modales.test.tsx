import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { ModalCargarInsumo } from "./ModalCargarInsumo";
import { ModalReponerBalde } from "./ModalReponerBalde";

// Las acciones reales devuelven SIEMPRE el mismo objeto de éxito: el modal tiene que
// cerrarse igual en la segunda carga, aunque el estado que devuelve no cambie.
const { registrarMovimiento, registrarAjusteBalde } = vi.hoisted(() => {
  const EXITO = { error: null };
  return {
    registrarMovimiento: vi.fn(async () => EXITO),
    registrarAjusteBalde: vi.fn(async () => EXITO),
  };
});

vi.mock("../consultas/accionesInsumos", () => ({ registrarMovimiento }));
vi.mock("../consultas/acciones", () => ({ registrarAjusteBalde }));

/** Un padre como el de Stock: dueño del estado "abierto" que el modal le pide cerrar. */
function Padre({
  modal,
}: {
  modal: (props: { abierto: boolean; onCerrar: () => void }) => ReactNode;
}) {
  const [abierto, setAbierto] = useState(true);
  return (
    <>
      {modal({ abierto, onCerrar: () => setAbierto(false) })}
      <button onClick={() => setAbierto(true)}>Abrir</button>
    </>
  );
}

async function confirmar() {
  const formulario = screen.getByRole("dialog").querySelector("form")!;
  await act(async () => {
    fireEvent.submit(formulario);
  });
}

const modales: [string, (props: { abierto: boolean; onCerrar: () => void }) => ReactNode][] = [
  [
    "ModalCargarInsumo",
    (props) => <ModalCargarInsumo {...props} insumoId={1} insumoNombre="Bombón" />,
  ],
  [
    "ModalReponerBalde",
    (props) => <ModalReponerBalde {...props} baldeId={1} saborNombre="Frutilla" kgRestante={3} />,
  ],
];

describe.each(modales)("%s", (_nombre, modal) => {
  let errores: MockInstance<typeof console.error>;

  beforeEach(() => {
    errores = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errores.mockRestore();
  });

  it("se cierra al confirmar sin que React se queje de actualizar al padre mientras renderiza", async () => {
    render(<Padre modal={modal} />);
    expect(screen.getByRole("dialog")).toBeTruthy();

    await confirmar();

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const quejas = errores.mock.calls.filter((llamada) =>
      String(llamada[0]).includes("Cannot update a component"),
    );
    expect(quejas).toEqual([]);
  });

  it("se cierra también la segunda vez que se carga, aunque el resultado sea el mismo objeto", async () => {
    render(<Padre modal={modal} />);
    await confirmar();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    fireEvent.click(screen.getByText("Abrir"));
    expect(screen.getByRole("dialog")).toBeTruthy();

    await confirmar();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
