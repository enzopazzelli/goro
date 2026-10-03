import { describe, expect, it } from "vitest";
import { libroDeInventario, type DatosDeInventario } from "./libroDeInventario";

const DATOS: DatosDeInventario = {
  sabores: [
    {
      id: 1,
      nombre: "Frutilla",
      activo: true,
      stockMinimo: null,
      precioBalde: null,
      color: "#cc0000",
    },
    {
      id: 2,
      nombre: "=Chocolate",
      activo: false,
      stockMinimo: 4,
      precioBalde: 90000,
      color: "#330000",
    },
  ],
  baldes: [
    {
      codigo: "GB0000001",
      saborNombre: "Frutilla",
      estado: "abierto",
      kgInicial: 10,
      kgRestante: 3.5,
      costo: 40000,
      costoEnvase: 9000,
    },
    {
      codigo: "GB0000002",
      saborNombre: "Frutilla",
      estado: "cerrado",
      kgInicial: 10,
      kgRestante: 10,
      costo: 40000,
      costoEnvase: 9000,
    },
    {
      codigo: "GB0000003",
      saborNombre: "Frutilla",
      estado: "vacio",
      kgInicial: 10,
      kgRestante: 0,
      costo: 40000,
      costoEnvase: 9000,
    },
  ],
  insumos: [],
  presentaciones: [],
  formatos: [],
  stockMinimoDefault: 2.5,
  precioBaldeDefault: 85000,
};

const valor = (celda: unknown) => (celda as { value?: unknown } | null)?.value;

describe("libroDeInventario", () => {
  const libro = libroDeInventario(DATOS);
  const hoja = (nombre: string) => libro.hojas.find((h) => h.nombre === nombre)!;

  it("trae las cinco hojas, con un ancho por cada columna", () => {
    expect(libro.hojas.map((h) => h.nombre)).toEqual([
      "Sabores",
      "Baldes",
      "Insumos",
      "Productos y envases",
      "Formatos",
    ]);
    for (const h of libro.hojas) {
      for (const fila of h.filas) expect(fila).toHaveLength(h.columnas.length);
    }
  });

  it("los kilos en stock son los del mostrador y la cámara: el balde vacío ya no está", () => {
    const frutilla = hoja("Sabores").filas[0]!;

    expect(valor(frutilla[2])).toBe(13.5);
    expect(valor(frutilla[3])).toBe(1);
  });

  it("un sabor sin mínimo ni precio propios muestra los del comercio", () => {
    const frutilla = hoja("Sabores").filas[0]!;
    const chocolate = hoja("Sabores").filas[1]!;

    expect(valor(frutilla[4])).toBe(2.5);
    expect(valor(frutilla[5])).toBe(85000);
    expect(valor(chocolate[4])).toBe(4);
    expect(valor(chocolate[5])).toBe(90000);
  });

  it("un nombre cargado a mano que parece fórmula sale como texto", () => {
    expect(valor(hoja("Sabores").filas[1]![0])).toBe("'=Chocolate");
  });

  it("el balde terminado se ve como 'por canjear', no como stock", () => {
    expect(valor(hoja("Baldes").filas[2]![2])).toBe("Vacío (por canjear)");
  });
});
