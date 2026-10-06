import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ModalSeTermino } from "./ModalSeTermino";

const { vaciarBalde } = vi.hoisted(() => ({
  vaciarBalde: vi.fn<(previo: unknown, datos: FormData) => Promise<{ error: null }>>(async () => ({
    error: null,
  })),
}));
vi.mock("../consultas/accionesCicloBalde", () => ({ vaciarBalde }));

function dibujar(onCerrar = vi.fn()) {
  render(
    <ModalSeTermino
      abierto
      onCerrar={onCerrar}
      baldeId={7}
      codigo="GB0000042"
      saborNombre="Frutilla"
      kgRestante={0.4}
    />,
  );
  return onCerrar;
}

async function confirmar() {
  await act(async () => {
    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);
  });
}

const campo = () => screen.getByLabelText("¿Cuánto se tiró? (kg)") as HTMLInputElement;

describe("ModalSeTermino", () => {
  afterEach(() => {
    vaciarBalde.mockClear();
    vi.restoreAllMocks();
  });

  it("el campo arranca vacío aunque el sistema estime kilos: un Enter no registra la estimación", () => {
    dibujar();
    expect(campo().value).toBe("");
  });

  it("manda lo que se tipeó y se cierra", async () => {
    const onCerrar = dibujar();
    fireEvent.change(campo(), { target: { value: "0.3" } });
    await confirmar();

    const datos = vaciarBalde.mock.calls[0]![1];
    expect(datos.get("kgTirado")).toBe("0.3");
    expect(datos.get("baldeId")).toBe("7");
    expect(onCerrar).toHaveBeenCalled();
  });

  it("si se tipea mucho más de lo estimado pregunta, y si no se confirma no manda nada", async () => {
    const preguntar = vi.spyOn(window, "confirm").mockReturnValue(false);
    dibujar();
    fireEvent.change(campo(), { target: { value: "4" } });
    await confirmar();

    expect(preguntar).toHaveBeenCalledOnce();
    expect(vaciarBalde).not.toHaveBeenCalled();
  });
});
