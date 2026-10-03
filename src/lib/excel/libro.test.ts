// @vitest-environment node

import { unzipSync, strFromU8 } from "fflate";
import { describe, expect, it, vi } from "vitest";
import { NOMBRE_COMERCIO } from "@/config/comercio";
import { aSlug } from "@/lib/slug";
import { entero, fechaYHora, kilos, plata, siNo, texto } from "./celdas";
import { construirLibro, respuestaDeExcel } from "./libro";

vi.mock("server-only", () => ({}));

/** Abre el .xlsx como lo haría Excel: es un zip con un XML por hoja. */
function abrir(buffer: Buffer) {
  const archivos = unzipSync(new Uint8Array(buffer));
  const contenido = (ruta: string) => strFromU8(archivos[ruta]!);
  return { archivos, contenido };
}

const HOJAS = [
  {
    nombre: "Sabores",
    columnas: [
      { titulo: "Sabor", ancho: 24 },
      { titulo: "Kilos", ancho: 10 },
    ],
    filas: [[texto("Frutilla"), kilos(12.5)]],
  },
  {
    nombre: "Gastos",
    columnas: [
      { titulo: "Detalle", ancho: 30 },
      { titulo: "Monto", ancho: 12 },
    ],
    filas: [[texto('=HYPERLINK("http://malo.example")'), plata(-1500)]],
  },
];

describe("construirLibro", () => {
  it("arma un .xlsx de verdad, con una pestaña por hoja y con su nombre", async () => {
    const { archivos, contenido } = abrir(await construirLibro(HOJAS));

    expect(Object.keys(archivos)).toContain("xl/workbook.xml");
    const libro = contenido("xl/workbook.xml");
    expect(libro).toContain("Sabores");
    expect(libro).toContain("Gastos");
  });

  it("un texto que Excel leería como fórmula sale como texto, con la comilla adelante", async () => {
    const { archivos, contenido } = abrir(await construirLibro(HOJAS));
    const hojas = Object.keys(archivos)
      .filter((ruta) => ruta.startsWith("xl/worksheets/"))
      .map(contenido)
      .join("");

    // Ni una celda de tipo fórmula, y el texto peligroso lleva su comilla.
    expect(hojas).not.toContain("<f>");
    expect(contenido("xl/sharedStrings.xml")).toContain("<t>'=HYPERLINK");
  });

  it("la plata negativa sigue siendo un número, no un texto con comilla", async () => {
    const { archivos, contenido } = abrir(await construirLibro(HOJAS));
    const hojas = Object.keys(archivos)
      .filter((ruta) => ruta.startsWith("xl/worksheets/"))
      .map(contenido)
      .join("");

    expect(hojas).toContain("<v>-1500</v>");
  });
});

describe("celdas", () => {
  it("un valor vacío es una celda vacía, y un cero es un cero", () => {
    expect(texto(null)).toBeNull();
    expect(texto("")).toBeNull();
    expect(entero(null)).toBeNull();
    expect(entero(0)).toEqual({ value: 0, type: Number });
    expect(plata(undefined)).toBeNull();
    expect(fechaYHora(null)).toBeNull();
  });

  it("la fecha sale con la hora del local, no la del servidor", () => {
    const celda = fechaYHora("2026-10-01T15:30:00Z");
    expect(celda).toMatchObject({ value: new Date("2026-10-01T12:30:00.000Z"), type: Date });
  });

  it("Sí y No en vez de verdadero y falso", () => {
    expect(siNo(true)).toMatchObject({ value: "Sí" });
    expect(siNo(false)).toMatchObject({ value: "No" });
  });
});

describe("respuestaDeExcel", () => {
  it("se baja como archivo, con el nombre del libro y la fecha de hoy, y sin caché", async () => {
    const respuesta = await respuestaDeExcel({ nombre: "inventario", hojas: HOJAS });

    // El prefijo es el nombre del comercio de la configuración: renombrarlo no rompe este test.
    expect(respuesta.headers.get("Content-Disposition")).toMatch(
      new RegExp(
        `^attachment; filename="${aSlug(NOMBRE_COMERCIO)}-inventario-\\d{4}-\\d{2}-\\d{2}\\.xlsx"$`,
      ),
    );
    expect(respuesta.headers.get("Content-Type")).toContain("spreadsheetml.sheet");
    expect(respuesta.headers.get("Cache-Control")).toBe("no-store");
    expect((await respuesta.arrayBuffer()).byteLength).toBeGreaterThan(500);
  });
});
