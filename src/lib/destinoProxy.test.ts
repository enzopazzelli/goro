import { describe, expect, it } from "vitest";
import { destinoDelProxy } from "./destinoProxy";

describe("destinoDelProxy", () => {
  it("una navegación sin sesión va a ingresar", () => {
    expect(destinoDelProxy({ metodo: "GET", ruta: "/ventas", tieneSesion: false })).toBe(
      "/ingresar",
    );
  });

  it("una navegación con sesión a la pantalla de ingreso va a inicio", () => {
    expect(destinoDelProxy({ metodo: "GET", ruta: "/ingresar", tieneSesion: true })).toBe(
      "/inicio",
    );
  });

  it("lo que está bien no se toca", () => {
    expect(destinoDelProxy({ metodo: "GET", ruta: "/ventas", tieneSesion: true })).toBeNull();
    expect(destinoDelProxy({ metodo: "GET", ruta: "/ingresar", tieneSesion: false })).toBeNull();
  });

  // El caso que se rompió: "Salir" desde una pestaña cuya sesión ya no valía
  // (la cuenta se había borrado desde Usuarios). El 307 hacía que el navegador
  // repitiera el POST contra /ingresar y Next tiraba "An unexpected response
  // was received from the server".
  it("una acción del servidor sin sesión NO se redirige: la resuelve la acción", () => {
    expect(destinoDelProxy({ metodo: "POST", ruta: "/ventas", tieneSesion: false })).toBeNull();
  });

  it("ingresar desde una pestaña que ya tenía sesión tampoco se redirige", () => {
    expect(destinoDelProxy({ metodo: "POST", ruta: "/ingresar", tieneSesion: true })).toBeNull();
  });
});
