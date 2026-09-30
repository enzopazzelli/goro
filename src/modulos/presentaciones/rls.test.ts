// @vitest-environment node
// Sin jsdom: ahí los clientes de Supabase comparten localStorage y el cliente de servicio
// termina actuando con la sesión de un usuario de prueba, sujeto a RLS.
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Corre contra un proyecto Supabase de PRUEBA, nunca el real — mismo criterio
 * que src/modulos/inventario/rls.test.ts. Excluido de `npm run test:unit`.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const clavePublica = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const claveServicio = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const servicio = createClient(url, claveServicio);

async function crearUsuarioDePrueba(rol: "duenio" | "colaborador") {
  const usuario = `t-${rol}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
  const email = `${usuario}@heladeria.local`;
  const password = "prueba-123456";

  const { data, error } = await servicio.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw error;

  if (rol === "duenio") {
    await servicio.from("perfiles").update({ rol: "duenio" }).eq("id", data.user.id);
  }

  const cliente = createClient(url, clavePublica);
  const { error: errorIngreso } = await cliente.auth.signInWithPassword({ email, password });
  if (errorIngreso) throw errorIngreso;

  return { id: data.user.id, cliente };
}

/** Código GA + 7 dígitos al azar: dos archivos de test corren en paralelo y no pueden chocar. */
function codigoDePrueba() {
  return `GA${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
}

describe("RLS: presentaciones de insumo", () => {
  let duenio: Awaited<ReturnType<typeof crearUsuarioDePrueba>>;
  let colaborador: Awaited<ReturnType<typeof crearUsuarioDePrueba>>;
  let anonimo: ReturnType<typeof createClient>;
  let insumoId: number;
  let presentacionId: number;

  beforeAll(async () => {
    duenio = await crearUsuarioDePrueba("duenio");
    colaborador = await crearUsuarioDePrueba("colaborador");
    anonimo = createClient(url, clavePublica);

    const { data: insumo } = await servicio
      .from("insumos")
      .insert({
        nombre: `Producto de prueba ${Date.now()}`,
        codigo: codigoDePrueba(),
        unidad: "u",
        minimo: 0,
        costo: 0,
      })
      .select("id")
      .single();
    insumoId = insumo!.id;

    const { data: presentacion } = await servicio
      .from("presentaciones_insumo")
      .insert({ insumo_id: insumoId, nombre: "Unidad", unidades: 1, precio: 1000, activo: true })
      .select("id")
      .single();
    presentacionId = presentacion!.id;
  });

  afterAll(async () => {
    await servicio.from("presentaciones_insumo").delete().eq("insumo_id", insumoId);
    await servicio.from("insumos").delete().eq("id", insumoId);
    await servicio.auth.admin.deleteUser(duenio.id);
    await servicio.auth.admin.deleteUser(colaborador.id);
  });

  it("sin sesión no se pueden leer las presentaciones", async () => {
    const { data } = await anonimo.from("presentaciones_insumo").select("id");
    // Sin privilegios sobre la tabla, PostgREST responde con error; con RLS a
    // secas, con lista vacía. Las dos cosas significan "no se ve nada".
    expect(data ?? []).toEqual([]);
  });

  it("un colaborador las lee", async () => {
    const { data } = await colaborador.cliente
      .from("presentaciones_insumo")
      .select("id")
      .eq("id", presentacionId);
    expect(data).toHaveLength(1);
  });

  it("un colaborador no puede crear una presentación", async () => {
    const { error } = await colaborador.cliente
      .from("presentaciones_insumo")
      .insert({ insumo_id: insumoId, nombre: "Docena", unidades: 12 });
    expect(error).not.toBeNull();
  });

  it("un colaborador no puede cambiar el precio", async () => {
    await colaborador.cliente
      .from("presentaciones_insumo")
      .update({ precio: 1 })
      .eq("id", presentacionId);
    const { data } = await servicio
      .from("presentaciones_insumo")
      .select("precio")
      .eq("id", presentacionId)
      .single();
    expect(data!.precio).toBe(1000);
  });

  it("el dueño crea una presentación inactiva y sin precio", async () => {
    const { error } = await duenio.cliente
      .from("presentaciones_insumo")
      .insert({ insumo_id: insumoId, nombre: "Docena", unidades: 12 });
    expect(error).toBeNull();
  });

  it("no puede haber dos presentaciones con las mismas unidades del mismo insumo", async () => {
    const { error } = await duenio.cliente
      .from("presentaciones_insumo")
      .insert({ insumo_id: insumoId, nombre: "Otra docena", unidades: 12 });
    expect(error?.code).toBe("23505");
  });

  it("una presentación no puede quedar activa a $0", async () => {
    const { error } = await duenio.cliente
      .from("presentaciones_insumo")
      .insert({ insumo_id: insumoId, nombre: "Caja", unidades: 24, precio: 0, activo: true });
    expect(error?.code).toBe("23514");
  });

  it("las unidades tienen que ser mayores a cero", async () => {
    const { error } = await duenio.cliente
      .from("presentaciones_insumo")
      .insert({ insumo_id: insumoId, nombre: "Cero", unidades: 0 });
    expect(error?.code).toBe("23514");
  });

  it("ni el dueño puede borrar una presentación: se desactiva", async () => {
    const { error } = await duenio.cliente
      .from("presentaciones_insumo")
      .delete()
      .eq("id", presentacionId);
    expect(error).not.toBeNull();
  });
});

describe("RLS: qué consume cada formato", () => {
  let duenio: Awaited<ReturnType<typeof crearUsuarioDePrueba>>;
  let colaborador: Awaited<ReturnType<typeof crearUsuarioDePrueba>>;
  let anonimo: ReturnType<typeof createClient>;
  let insumoId: number;
  let formatoId: number;

  beforeAll(async () => {
    duenio = await crearUsuarioDePrueba("duenio");
    colaborador = await crearUsuarioDePrueba("colaborador");
    anonimo = createClient(url, clavePublica);

    const { data: insumo } = await servicio
      .from("insumos")
      .insert({
        nombre: `Cono de prueba ${Date.now()}`,
        codigo: codigoDePrueba(),
        unidad: "u",
        minimo: 0,
        costo: 0,
      })
      .select("id")
      .single();
    insumoId = insumo!.id;

    const { data: formato } = await servicio
      .from("formatos")
      .insert({
        nombre: `Formato de prueba ${Date.now()}`,
        gramos: 130,
        cantidad_sabores: 2,
        precio: 0,
      })
      .select("id")
      .single();
    formatoId = formato!.id;
  });

  afterAll(async () => {
    await servicio.from("formatos").delete().eq("id", formatoId);
    await servicio.from("insumos").delete().eq("id", insumoId);
    await servicio.auth.admin.deleteUser(duenio.id);
    await servicio.auth.admin.deleteUser(colaborador.id);
  });

  it("sin sesión no se puede leer", async () => {
    const { data } = await anonimo.from("formato_insumos").select("formato_id");
    // Sin privilegios sobre la tabla, PostgREST responde con error; con RLS a
    // secas, con lista vacía. Las dos cosas significan "no se ve nada".
    expect(data ?? []).toEqual([]);
  });

  it("un colaborador no puede crear un consumo", async () => {
    const { error } = await colaborador.cliente
      .from("formato_insumos")
      .insert({ formato_id: formatoId, insumo_id: insumoId, cantidad: 1 });
    expect(error).not.toBeNull();
  });

  it("el dueño crea un consumo y un colaborador lo lee", async () => {
    const { error } = await duenio.cliente
      .from("formato_insumos")
      .insert({ formato_id: formatoId, insumo_id: insumoId, cantidad: 1 });
    expect(error).toBeNull();

    const { data } = await colaborador.cliente
      .from("formato_insumos")
      .select("cantidad")
      .eq("formato_id", formatoId);
    expect(data).toEqual([{ cantidad: 1 }]);
  });

  it("no se repite el mismo insumo en el mismo formato", async () => {
    const { error } = await duenio.cliente
      .from("formato_insumos")
      .insert({ formato_id: formatoId, insumo_id: insumoId, cantidad: 2 });
    expect(error?.code).toBe("23505");
  });

  it("la cantidad tiene que ser mayor a cero", async () => {
    const { error } = await servicio
      .from("formato_insumos")
      .update({ cantidad: 0 })
      .eq("formato_id", formatoId);
    expect(error?.code).toBe("23514");
  });

  it("un colaborador no puede quitar un consumo", async () => {
    await colaborador.cliente.from("formato_insumos").delete().eq("formato_id", formatoId);
    const { data } = await servicio
      .from("formato_insumos")
      .select("cantidad")
      .eq("formato_id", formatoId);
    expect(data).toHaveLength(1);
  });

  it("borrar el formato borra sus consumos", async () => {
    const { data: otro } = await servicio
      .from("formatos")
      .insert({
        nombre: `Formato efímero ${Date.now()}`,
        gramos: 65,
        cantidad_sabores: 1,
        precio: 0,
      })
      .select("id")
      .single();
    await servicio
      .from("formato_insumos")
      .insert({ formato_id: otro!.id, insumo_id: insumoId, cantidad: 1 });

    await servicio.from("formatos").delete().eq("id", otro!.id);

    const { data } = await servicio
      .from("formato_insumos")
      .select("cantidad")
      .eq("formato_id", otro!.id);
    expect(data).toEqual([]);
  });
});
