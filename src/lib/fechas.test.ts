import { describe, expect, it } from "vitest";
import { diaYHoraDe, horaDe, relojDelLocal } from "./fechas";

describe("fechas en la hora del local", () => {
  it("17:30 UTC son las 14:30 en Buenos Aires", () => {
    expect(horaDe("2026-10-01T17:30:00Z")).toBe("14:30");
  });

  it("pasada la medianoche UTC sigue siendo el día anterior en el local", () => {
    expect(diaYHoraDe("2026-10-02T01:15:00Z")).toBe("jue 01/10, 22:15");
  });
});

describe("relojDelLocal", () => {
  it("devuelve la hora que marcaba el reloj del mostrador, puesta como UTC", () => {
    expect(relojDelLocal("2026-10-01T15:30:00Z").toISOString()).toBe("2026-10-01T12:30:00.000Z");
  });

  it("cruza la medianoche: las 01:15 UTC son las 22:15 del día anterior", () => {
    expect(relojDelLocal("2026-10-02T01:15:00Z").toISOString()).toBe("2026-10-01T22:15:00.000Z");
  });
});
