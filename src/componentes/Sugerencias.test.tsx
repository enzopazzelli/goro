import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { OpcionDeBusqueda } from "@/lib/buscarPorNombre";
import { ListaDeSugerencias, useSugerencias } from "./Sugerencias";

const OPCIONES: OpcionDeBusqueda[] = [
  { clave: "1", nombre: "Bombón · ×1", detalle: "$500" },
  { clave: "12", nombre: "Bombón · ×12", detalle: "$5.000" },
  { clave: "c", nombre: "Cucurucho" },
];

/** Un campo como los de las pantallas: lo que la lista no usa, lo maneja el campo. */
function Campo({
  onElegir,
  onEnterDelCampo,
}: {
  onElegir: (opcion: OpcionDeBusqueda) => void;
  onEnterDelCampo: () => void;
}) {
  const buscador = useSugerencias(OPCIONES, onElegir);
  return (
    <div>
      <input
        aria-label="Código o nombre"
        onChange={(evento) => buscador.alEscribir(evento.target.value)}
        onKeyDown={(evento) => {
          if (!buscador.alTeclear(evento) && evento.key === "Enter") onEnterDelCampo();
        }}
      />
      <ListaDeSugerencias {...buscador} />
    </div>
  );
}

function dibujar() {
  const onElegir = vi.fn();
  const onEnterDelCampo = vi.fn();
  render(<Campo onElegir={onElegir} onEnterDelCampo={onEnterDelCampo} />);
  return { onElegir, onEnterDelCampo, campo: screen.getByLabelText("Código o nombre") };
}

describe("Sugerencias", () => {
  it("escribir un nombre muestra lo que coincide, con su detalle", () => {
    const { campo } = dibujar();
    fireEvent.change(campo, { target: { value: "bombon" } });

    expect(screen.getAllByRole("option").map((opcion) => opcion.textContent)).toEqual([
      "Bombón · ×1$500",
      "Bombón · ×12$5.000",
    ]);
  });

  it("con las flechas se elige otra y Enter la toma; el campo no recibe ese Enter", () => {
    const { campo, onElegir, onEnterDelCampo } = dibujar();
    fireEvent.change(campo, { target: { value: "bombon" } });
    fireEvent.keyDown(campo, { key: "ArrowDown" });
    fireEvent.keyDown(campo, { key: "Enter" });

    expect(onElegir).toHaveBeenCalledWith(OPCIONES[1]);
    expect(onEnterDelCampo).not.toHaveBeenCalled();
    expect(screen.queryByRole("option")).toBeNull();
  });

  it("un clic en una sugerencia la elige", () => {
    const { campo, onElegir } = dibujar();
    fireEvent.change(campo, { target: { value: "cucu" } });
    fireEvent.click(screen.getByRole("button", { name: /Cucurucho/ }));

    expect(onElegir).toHaveBeenCalledWith(OPCIONES[2]);
  });

  it("un código no muestra sugerencias y su Enter sigue siendo del campo", () => {
    const { campo, onElegir, onEnterDelCampo } = dibujar();
    fireEvent.change(campo, { target: { value: "GA0000012" } });
    fireEvent.keyDown(campo, { key: "Enter" });

    expect(screen.queryByRole("option")).toBeNull();
    expect(onElegir).not.toHaveBeenCalled();
    expect(onEnterDelCampo).toHaveBeenCalled();
  });

  it("Escape cierra la lista sin elegir nada", () => {
    const { campo, onElegir } = dibujar();
    fireEvent.change(campo, { target: { value: "bombon" } });
    fireEvent.keyDown(campo, { key: "Escape" });

    expect(screen.queryByRole("option")).toBeNull();
    expect(onElegir).not.toHaveBeenCalled();
  });
});
