import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RolYPermisos } from "./CamposDePermisos";
import { ProveedorDePermisos, SiPuede } from "./Permisos";

function montar(perfil: Parameters<typeof ProveedorDePermisos>[0]["perfil"] | null) {
  const contenido = (
    <>
      <SiPuede permiso="anular_ventas">
        <button>Anular</button>
      </SiPuede>
      <SiPuede permiso="movimientos_caja">
        <button>Gasto</button>
      </SiPuede>
    </>
  );
  render(
    perfil ? <ProveedorDePermisos perfil={perfil}>{contenido}</ProveedorDePermisos> : contenido,
  );
}

describe("SiPuede", () => {
  it("un colaborador ve solo lo que tiene en su lista", () => {
    montar({ rol: "colaborador", permisos: ["anular_ventas"] });

    expect(screen.queryByRole("button", { name: "Anular" })).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Gasto" })).toBeNull();
  });

  it("el dueño lo ve todo, aunque su lista esté vacía", () => {
    montar({ rol: "duenio", permisos: [] });

    expect(screen.queryByRole("button", { name: "Anular" })).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Gasto" })).not.toBeNull();
  });

  it("sin proveedor no se muestra nada: ante la duda, el botón no aparece", () => {
    montar(null);

    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("RolYPermisos", () => {
  const tildado = (nombre: RegExp) =>
    (screen.getByRole("checkbox", { name: nombre }) as HTMLInputElement).checked;

  it("a un colaborador le muestra sus permisos tildados o no", () => {
    render(<RolYPermisos rolInicial="colaborador" permisosIniciales={["anular_ventas"]} />);

    expect(tildado(/Anular ventas/)).toBe(true);
    expect(tildado(/gastos, ingresos y retiros/)).toBe(false);
    expect(tildado(/Cargar mercadería/)).toBe(false);
  });

  it("un colaborador nuevo arranca con todos tildados, que es lo que ya podía hacer", () => {
    render(<RolYPermisos rolInicial="colaborador" />);

    expect(screen.getAllByRole("checkbox").every((c) => (c as HTMLInputElement).checked)).toBe(
      true,
    );
  });

  it("al elegir dueño las casillas desaparecen: el dueño puede todo", () => {
    render(<RolYPermisos rolInicial="colaborador" />);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "duenio" } });

    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    expect(screen.getByText("El dueño puede hacer todo.")).toBeTruthy();
  });
});
