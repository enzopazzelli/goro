import { describe, expect, it } from "vitest";
import { leerDescarte } from "./formulario";

const CLAVE = "3f2b8c1e-5d4a-4f6b-9c7d-1a2b3c4d5e6f";

function formulario(campos: Record<string, string>): FormData {
  const datos = new FormData();
  const completos = { cantidad: "2", motivo: "roto", clave: CLAVE, ...campos };
  for (const [nombre, valor] of Object.entries(completos)) datos.set(nombre, valor);
  return datos;
}

describe("leerDescarte", () => {
  it("si vino un código manda el código, aunque también haya algo elegido en la lista", () => {
    expect(leerDescarte(formulario({ codigo: " GA0000012 ", insumoId: "5" }))).toMatchObject({
      codigo: "GA0000012",
      insumoId: null,
    });
  });

  it("sin código usa lo elegido en la lista", () => {
    expect(leerDescarte(formulario({ codigo: "", insumoId: "5" }))).toMatchObject({
      codigo: null,
      insumoId: 5,
      cantidad: 2,
      motivo: "roto",
      nota: null,
      clave: CLAVE,
    });
  });

  it("sin código ni nada elegido, pide qué se tira", () => {
    expect(leerDescarte(formulario({ insumoId: "" }))).toEqual({
      error: "Escaneá el código o elegí qué se tira.",
    });
  });

  it.each(["0", "-2", "", "dos"])("una cantidad %j no se acepta", (cantidad) => {
    expect(leerDescarte(formulario({ insumoId: "5", cantidad }))).toEqual({
      error: "La cantidad tiene que ser mayor a cero.",
    });
  });

  it("el resto de balde no se elige a mano", () => {
    expect(leerDescarte(formulario({ insumoId: "5", motivo: "resto_de_balde" }))).toEqual({
      error: "Elegí por qué se tira.",
    });
  });

  it("una nota de más de 200 letras se frena acá, antes de llegar a la base", () => {
    const resultado = leerDescarte(formulario({ insumoId: "5", nota: "a".repeat(201) }));
    expect(resultado).toHaveProperty("error");
  });

  it("una clave mal formada no viaja: el descarte se manda sin clave", () => {
    expect(leerDescarte(formulario({ insumoId: "5", clave: "" }))).toMatchObject({ clave: null });
  });
});
