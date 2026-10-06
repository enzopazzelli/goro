import { describe, expect, it } from "vitest";
import { descarteDeFila, type FilaDescarte } from "./filas";
import { resumirDescartes } from "./resumen";
import { textoDeCantidad } from "./cantidad";
import type { Descarte } from "./tipos";

function descarte(cambios: Partial<Descarte>): Descarte {
  return {
    id: 1,
    tipo: "balde",
    que: "Frutilla",
    grupo: "sabor:1",
    cantidad: 1,
    unidad: "kg",
    motivo: "resto_de_balde",
    nota: null,
    costo: 100,
    creadoPor: "u1",
    creadoEn: "2026-10-06T15:00:00Z",
    ...cambios,
  };
}

function fila(cambios: Partial<FilaDescarte>): FilaDescarte {
  return {
    id: 1,
    tipo: "balde",
    insumo_id: null,
    cantidad: "0.4",
    unidad: "kg",
    motivo: "resto_de_balde",
    nota: null,
    costo: 40,
    creado_por: "u1",
    creado_en: "2026-10-06T15:00:00Z",
    insumos: null,
    baldes: { sabor_id: 7, sabores: { nombre: "Frutilla" } },
    ...cambios,
  };
}

describe("descarteDeFila", () => {
  it("un resto de balde y un pote del mismo sabor se suman juntos, y la cantidad llega como número", () => {
    const balde = descarteDeFila(fila({}));
    const pote = descarteDeFila(fila({ tipo: "pote", cantidad: "0.25", motivo: "vencido" }));

    expect(balde).toMatchObject({ que: "Frutilla", grupo: "sabor:7", cantidad: 0.4 });
    expect(pote.grupo).toBe(balde.grupo);
  });

  it("un artículo se agrupa por artículo y por unidad", () => {
    const articulo = descarteDeFila(
      fila({
        tipo: "insumo",
        insumo_id: 3,
        cantidad: "2",
        unidad: "u",
        insumos: { nombre: "Cucurucho" },
        baldes: null,
      }),
    );

    expect(articulo).toMatchObject({ que: "Cucurucho", grupo: "insumo:3:u", cantidad: 2 });
  });
});

describe("resumirDescartes", () => {
  it("sin descartes, todo en cero", () => {
    expect(resumirDescartes([])).toEqual({ total: 0, ranking: [], porMotivo: [] });
  });

  it("suma por grupo y ordena por plata, no por cantidad", () => {
    const resumen = resumirDescartes([
      descarte({ id: 1, grupo: "sabor:1", que: "Frutilla", cantidad: 0.4, costo: 40 }),
      descarte({ id: 2, grupo: "sabor:1", que: "Frutilla", cantidad: 0.25, costo: 25 }),
      descarte({
        id: 3,
        tipo: "insumo",
        grupo: "insumo:3:u",
        que: "Cucurucho",
        cantidad: 10,
        unidad: "u",
        motivo: "roto",
        costo: 3000,
      }),
    ]);

    expect(resumen.total).toBe(3065);
    expect(resumen.ranking.map((renglon) => renglon.que)).toEqual(["Cucurucho", "Frutilla"]);
    expect(resumen.ranking[1]).toMatchObject({ costo: 65, veces: 2, unidad: "kg" });
    expect(resumen.ranking[1]!.cantidad).toBeCloseTo(0.65);
  });

  it("el mismo artículo contado en dos unidades distintas no se mezcla", () => {
    const resumen = resumirDescartes([
      descarte({ grupo: "insumo:3:u", que: "Crema", unidad: "u", cantidad: 2, costo: 10 }),
      descarte({ grupo: "insumo:3:kg", que: "Crema", unidad: "kg", cantidad: 1.5, costo: 20 }),
    ]);

    expect(resumen.ranking).toHaveLength(2);
  });

  it("junta los motivos con cuántas veces y cuánta plata", () => {
    const resumen = resumirDescartes([
      descarte({ motivo: "vencido", costo: 30 }),
      descarte({ motivo: "vencido", costo: 20 }),
      descarte({ motivo: "roto", costo: 100 }),
    ]);

    expect(resumen.porMotivo).toEqual([
      { motivo: "roto", veces: 1, costo: 100 },
      { motivo: "vencido", veces: 2, costo: 50 },
    ]);
  });
});

describe("textoDeCantidad", () => {
  it("escribe la cantidad como se lee acá, con su unidad", () => {
    expect(textoDeCantidad(0.25, "kg")).toBe("0,25 kg");
    expect(textoDeCantidad(1.5, "kg")).toBe("1,5 kg");
    expect(textoDeCantidad(3, "u")).toBe("3 u");
  });
});
