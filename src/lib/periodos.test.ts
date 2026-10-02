import { describe, expect, it } from "vitest";
import { diaCorto, diaLocal, periodoDeAtajo, periodoPedido, rangoUtc } from "./periodos";

// Jueves 1 de octubre de 2026, 14:30 en Buenos Aires.
const JUEVES = new Date("2026-10-01T17:30:00Z");

describe("diaLocal", () => {
  it("es el día del local, no el del servidor en UTC", () => {
    // 01:15 UTC del 2 todavía es la noche del 1 en el local.
    expect(diaLocal(new Date("2026-10-02T01:15:00Z"))).toBe("2026-10-01");
  });

  it("pasadas las 21:00 del local ya es el día siguiente en UTC", () => {
    expect(diaLocal(new Date("2026-10-01T23:30:00Z"))).toBe("2026-10-01");
  });
});

describe("periodoDeAtajo", () => {
  it("el día es hoy solo", () => {
    expect(periodoDeAtajo("dia", JUEVES)).toEqual({ desde: "2026-10-01", hasta: "2026-10-01" });
  });

  it("la semana arranca el lunes", () => {
    expect(periodoDeAtajo("semana", JUEVES)).toEqual({ desde: "2026-09-28", hasta: "2026-10-01" });
  });

  it("un domingo la semana sigue siendo la que arrancó el lunes anterior", () => {
    const domingo = new Date("2026-10-04T17:30:00Z");
    expect(periodoDeAtajo("semana", domingo)).toEqual({
      desde: "2026-09-28",
      hasta: "2026-10-04",
    });
  });

  it("el mes arranca el día 1", () => {
    const quince = new Date("2026-10-15T17:30:00Z");
    expect(periodoDeAtajo("mes", quince)).toEqual({ desde: "2026-10-01", hasta: "2026-10-15" });
  });
});

describe("periodoPedido", () => {
  it("sin parámetros, hoy", () => {
    expect(periodoPedido({}, JUEVES)).toEqual({ desde: "2026-10-01", hasta: "2026-10-01" });
  });

  it("con desde solo, hasta hoy", () => {
    expect(periodoPedido({ desde: "2026-09-25" }, JUEVES)).toEqual({
      desde: "2026-09-25",
      hasta: "2026-10-01",
    });
  });

  it("con hasta solo, ese día", () => {
    expect(periodoPedido({ hasta: "2026-09-25" }, JUEVES)).toEqual({
      desde: "2026-09-25",
      hasta: "2026-09-25",
    });
  });

  it("al revés se dan vuelta: es un error de tipeo, no un filtro vacío", () => {
    expect(periodoPedido({ desde: "2026-10-01", hasta: "2026-09-25" }, JUEVES)).toEqual({
      desde: "2026-09-25",
      hasta: "2026-10-01",
    });
  });

  it.each(["ayer", "", "2026-13-01", "2026-02-30", "26-10-01", "2026-10-01T00:00:00Z"])(
    "ignora %j y usa hoy: un parámetro mal escrito no deja la pantalla vacía",
    (basura) => {
      expect(periodoPedido({ desde: basura, hasta: basura }, JUEVES)).toEqual({
        desde: "2026-10-01",
        hasta: "2026-10-01",
      });
    },
  );
});

describe("rangoUtc", () => {
  it("el día del local arranca a las 03:00 UTC y el cierre es exclusivo", () => {
    expect(rangoUtc({ desde: "2026-10-01", hasta: "2026-10-01" })).toEqual({
      desdeIso: "2026-10-01T03:00:00.000Z",
      hastaIso: "2026-10-02T03:00:00.000Z",
    });
  });

  it("el cierre cruza el fin de mes", () => {
    expect(rangoUtc({ desde: "2026-09-28", hasta: "2026-09-30" })).toEqual({
      desdeIso: "2026-09-28T03:00:00.000Z",
      hastaIso: "2026-10-01T03:00:00.000Z",
    });
  });

  it("el cierre cruza el fin de año", () => {
    expect(rangoUtc({ desde: "2026-12-31", hasta: "2026-12-31" })).toEqual({
      desdeIso: "2026-12-31T03:00:00.000Z",
      hastaIso: "2027-01-01T03:00:00.000Z",
    });
  });

  it("febrero de un año bisiesto", () => {
    expect(rangoUtc({ desde: "2028-02-29", hasta: "2028-02-29" })).toEqual({
      desdeIso: "2028-02-29T03:00:00.000Z",
      hastaIso: "2028-03-01T03:00:00.000Z",
    });
  });
});

describe("diaCorto", () => {
  it("es el día y el mes, como se escribe acá", () => {
    expect(diaCorto("2026-09-28")).toBe("28/09");
  });
});
