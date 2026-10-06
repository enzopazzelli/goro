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
  it("lee el código sin espacios, la cantidad, el motivo y la clave", () => {
    expect(leerDescarte(formulario({ codigo: " GA0000012 " }))).toEqual({
      codigo: "GA0000012",
      cantidad: 2,
      motivo: "roto",
      nota: null,
      clave: CLAVE,
    });
  });

  it("sin código pide qué se tira", () => {
    expect(leerDescarte(formulario({ codigo: "  " }))).toEqual({
      error: "Escaneá el código o buscá por nombre qué se tira.",
    });
  });

  it.each(["0", "-2", "", "dos"])("una cantidad %j no se acepta", (cantidad) => {
    expect(leerDescarte(formulario({ codigo: "GA0000012", cantidad }))).toEqual({
      error: "La cantidad tiene que ser mayor a cero.",
    });
  });

  it("el resto de balde no se elige a mano", () => {
    expect(leerDescarte(formulario({ codigo: "GA0000012", motivo: "resto_de_balde" }))).toEqual({
      error: "Elegí por qué se tira.",
    });
  });

  it("una nota de más de 200 letras se frena acá, antes de llegar a la base", () => {
    const resultado = leerDescarte(formulario({ codigo: "GA0000012", nota: "a".repeat(201) }));
    expect(resultado).toHaveProperty("error");
  });

  it("una clave mal formada no viaja: el descarte se manda sin clave", () => {
    expect(leerDescarte(formulario({ codigo: "GA0000012", clave: "" }))).toMatchObject({
      clave: null,
    });
  });
});
