import { describe, expect, it } from "vitest";
import { diaYHoraDe, horaDe } from "./fechas";

describe("fechas en la hora del local", () => {
  it("17:30 UTC son las 14:30 en Buenos Aires", () => {
    expect(horaDe("2026-10-01T17:30:00Z")).toBe("14:30");
  });

  it("pasada la medianoche UTC sigue siendo el día anterior en el local", () => {
    expect(diaYHoraDe("2026-10-02T01:15:00Z")).toBe("jue 01/10, 22:15");
  });
});
