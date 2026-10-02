import { describe, expect, it } from "vitest";
import { unParametro } from "./parametros";

describe("unParametro", () => {
  it("de una lista vale el primero", () => {
    expect(unParametro(["efectivo", "tarjeta"])).toBe("efectivo");
  });

  it("un valor suelto pasa igual", () => {
    expect(unParametro("efectivo")).toBe("efectivo");
  });

  it("lo que no vino sigue sin venir", () => {
    expect(unParametro(undefined)).toBeUndefined();
    expect(unParametro([])).toBeUndefined();
  });
});
