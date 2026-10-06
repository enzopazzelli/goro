// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { generarCodigo } from "@/lib/codigos/codigo";
import { articuloDelCodigo } from "./articuloDelCodigo";

vi.mock("server-only", () => ({}));

/** Un cliente que contesta `resolver_codigo` con lo que diga el caso. */
function clienteQueResuelve(filas: { tipo: string; id: number }[]) {
  const rpc = vi.fn(async () => ({ data: filas, error: null }));
  return { cliente: { rpc } as unknown as Parameters<typeof articuloDelCodigo>[0], rpc };
}

describe("articuloDelCodigo", () => {
  it("un código de artículo devuelve el id del artículo", async () => {
    const { cliente } = clienteQueResuelve([{ tipo: "articulo", id: 12 }]);
    expect(await articuloDelCodigo(cliente, generarCodigo("A", 12))).toEqual({ articuloId: 12 });
  });

  it("un pote o un balde se distinguen, para que cada pantalla diga dónde se maneja", async () => {
    const pote = clienteQueResuelve([{ tipo: "pote", id: 3 }]);
    const balde = clienteQueResuelve([{ tipo: "balde", id: 4 }]);

    expect(await articuloDelCodigo(pote.cliente, generarCodigo("P", 3))).toEqual({ otro: "pote" });
    expect(await articuloDelCodigo(balde.cliente, generarCodigo("B", 4))).toEqual({
      otro: "balde",
    });
  });

  it("un código que no es de este sistema no llega a la base", async () => {
    const { cliente, rpc } = clienteQueResuelve([]);
    expect(await articuloDelCodigo(cliente, "7790001234567")).toHaveProperty("error");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("un código bien formado que no está cargado lo dice", async () => {
    const { cliente } = clienteQueResuelve([]);
    expect(await articuloDelCodigo(cliente, generarCodigo("A", 99))).toEqual({
      error: "Ese código no está cargado.",
    });
  });
});
