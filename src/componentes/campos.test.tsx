import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Campo } from "./Campo";
import { CampoChico } from "./CampoChico";

// Un casillero numérico que arranca en 0 no debe obligar a borrar el 0: al hacer
// click tiene que quedar todo seleccionado para que lo que se escriba lo pise.
describe.each([
  [
    "Campo",
    (props: { type: string }) => <Campo etiqueta="Precio" id="p" defaultValue="0" {...props} />,
  ],
  [
    "CampoChico",
    (props: { type: string }) => <CampoChico etiqueta="Precio" defaultValue="0" {...props} />,
  ],
])("%s", (_nombre, dibujar) => {
  afterEach(() => vi.restoreAllMocks());

  it("selecciona todo el contenido al enfocar un casillero numérico", () => {
    const seleccionar = vi.spyOn(HTMLInputElement.prototype, "select");
    render(dibujar({ type: "number" }));
    fireEvent.focus(screen.getByLabelText("Precio"));
    expect(seleccionar).toHaveBeenCalledTimes(1);
  });

  it("no toca los casilleros de texto: ahí quien escribe quiere ubicar el cursor", () => {
    const seleccionar = vi.spyOn(HTMLInputElement.prototype, "select");
    render(dibujar({ type: "text" }));
    fireEvent.focus(screen.getByLabelText("Precio"));
    expect(seleccionar).not.toHaveBeenCalled();
  });
});
