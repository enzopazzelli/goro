import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Corre contra un proyecto Supabase de PRUEBA, nunca el real: crea usuarios y
 * filas descartables con la clave de servicio, prueba con la clave pública, y
 * limpia todo en afterAll. Excluido de `npm run test:unit` por el glob de
 * package.json — solo lo corre el job `seguridad` de CI cuando existe
 * `SUPABASE_PRUEBAS` (ver .github/workflows/ci.yml).
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const clavePublica = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const claveServicio = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const servicio = createClient(url, claveServicio);

async function crearUsuarioDePrueba(rol: "duenio" | "colaborador") {
  const usuario = `test-${rol}-${Date.now()}`;
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

describe("RLS: inventario", () => {
  let duenio: Awaited<ReturnType<typeof crearUsuarioDePrueba>>;
  let colaborador: Awaited<ReturnType<typeof crearUsuarioDePrueba>>;
  let anonimo: ReturnType<typeof createClient>;
  let saborId: number;
  let insumoId: number;

  beforeAll(async () => {
    duenio = await crearUsuarioDePrueba("duenio");
    colaborador = await crearUsuarioDePrueba("colaborador");
    anonimo = createClient(url, clavePublica);

    const { data: sabor } = await servicio
      .from("sabores")
      .insert({ nombre: `Sabor de prueba ${Date.now()}` })
      .select("id")
      .single();
    saborId = sabor!.id;

    const { data: insumo } = await servicio
      .from("insumos")
      .insert({
        nombre: `Insumo de prueba ${Date.now()}`,
        codigo: `GA${String(Date.now()).slice(-7)}`,
        unidad: "u",
        minimo: 1,
        costo: 100,
      })
      .select("id")
      .single();
    insumoId = insumo!.id;
  });

  afterAll(async () => {
    await servicio.from("movimientos_insumo").delete().eq("insumo_id", insumoId);
    await servicio.from("insumos").delete().eq("id", insumoId);
    await servicio.from("sabores").delete().eq("id", saborId);
    await servicio.auth.admin.deleteUser(duenio.id);
    await servicio.auth.admin.deleteUser(colaborador.id);
  });

  it("sin sesión no se puede leer sabores", async () => {
    const { error } = await anonimo.from("sabores").select("id");
    expect(error).not.toBeNull();
  });

  it("un colaborador no puede crear un sabor", async () => {
    const { error } = await colaborador.cliente
      .from("sabores")
      .insert({ nombre: "Sabor de colaborador" });
    expect(error).not.toBeNull();
  });

  it("un colaborador no puede editar el costo de un insumo", async () => {
    await colaborador.cliente.from("insumos").update({ costo: 999 }).eq("id", insumoId);
    const { data } = await servicio.from("insumos").select("costo").eq("id", insumoId).single();
    expect(data!.costo).toBe(100);
  });

  it("un colaborador no puede insertar directo en movimientos_insumo", async () => {
    const { error } = await colaborador.cliente
      .from("movimientos_insumo")
      .insert({ insumo_id: insumoId, tipo: "entrada", cantidad: 5, creado_por: colaborador.id });
    expect(error).not.toBeNull();
  });

  it("no se puede insertar un insumo con cantidad distinta de cero", async () => {
    const { error } = await servicio.from("insumos").insert({
      nombre: `Insumo con stock trucho ${Date.now()}`,
      codigo: `GA${String(Date.now()).slice(-7)}`,
      unidad: "u",
      minimo: 1,
      costo: 100,
      cantidad: 500,
    });
    expect(error).not.toBeNull();
  });

  it("un usuario sin sesión no puede pedir el próximo número de secuencia", async () => {
    const { error: errorInsumo } = await anonimo.rpc("siguiente_numero_insumo");
    expect(errorInsumo).not.toBeNull();

    const { error: errorBalde } = await anonimo.rpc("siguiente_numero_balde");
    expect(errorBalde).not.toBeNull();
  });

  it("un dueño sí puede crear un sabor", async () => {
    const nombre = `Sabor de dueño ${Date.now()}`;
    const { data, error } = await duenio.cliente
      .from("sabores")
      .insert({ nombre })
      .select("id")
      .single();
    expect(error).toBeNull();

    await servicio.from("sabores").delete().eq("id", data!.id);
  });

  it("un colaborador sí puede registrar un movimiento por la función", async () => {
    const { error } = await colaborador.cliente.rpc("registrar_movimiento_insumo", {
      p_insumo_id: insumoId,
      p_tipo: "entrada",
      p_cantidad: 5,
      p_motivo: "prueba",
    });
    expect(error).toBeNull();
  });

  it("un colaborador sí puede dar de alta un balde", async () => {
    const { data, error } = await colaborador.cliente
      .from("baldes")
      .insert({
        codigo: `GB${String(Date.now()).slice(-7)}`,
        sabor_id: saborId,
        kg_inicial: 9,
        kg_restante: 9,
        costo: 1000,
        costo_envase: 500,
      })
      .select("id")
      .single();
    expect(error).toBeNull();

    await servicio.from("baldes").delete().eq("id", data!.id);
  });

  it("no se puede abrir dos baldes del mismo sabor a la vez", async () => {
    const { data: baldeA } = await servicio
      .from("baldes")
      .insert({
        codigo: `GB${String(Date.now()).slice(-7)}`,
        sabor_id: saborId,
        kg_inicial: 9,
        kg_restante: 9,
        estado: "abierto",
        costo: 1000,
        costo_envase: 500,
      })
      .select("id")
      .single();

    const { data: baldeB } = await servicio
      .from("baldes")
      .insert({
        codigo: `GB${String(Date.now() + 1).slice(-7)}`,
        sabor_id: saborId,
        kg_inicial: 9,
        kg_restante: 9,
        costo: 1000,
        costo_envase: 500,
      })
      .select("id")
      .single();

    const { error } = await colaborador.cliente
      .from("baldes")
      .update({ estado: "abierto" })
      .eq("id", baldeB!.id);

    expect(error).not.toBeNull();

    await servicio.from("baldes").delete().in("id", [baldeA!.id, baldeB!.id]);
  });

  it("un colaborador no puede crear un formato", async () => {
    const { error } = await colaborador.cliente
      .from("formatos")
      .insert({ nombre: "Formato de colaborador", gramos: 250, cantidad_sabores: 1, precio: 1000 });
    expect(error).not.toBeNull();
  });

  it("un colaborador no puede editar ni borrar un formato existente", async () => {
    const { data: formato } = await servicio
      .from("formatos")
      .insert({
        nombre: `Formato ajeno ${Date.now()}`,
        gramos: 250,
        cantidad_sabores: 1,
        precio: 1000,
      })
      .select("id")
      .single();

    // RLS filtra por `using`, no tira error: la fila simplemente no matchea
    // y la operación "tiene éxito" sin tocar nada (mismo criterio que el
    // caso de insumos.costo más arriba en este archivo).
    await colaborador.cliente.from("formatos").update({ precio: 1 }).eq("id", formato!.id);
    const { data: trasEditar } = await servicio
      .from("formatos")
      .select("precio")
      .eq("id", formato!.id)
      .single();
    expect(trasEditar!.precio).toBe(1000);

    await colaborador.cliente.from("formatos").delete().eq("id", formato!.id);
    const { data: trasBorrar } = await servicio
      .from("formatos")
      .select("id")
      .eq("id", formato!.id)
      .maybeSingle();
    expect(trasBorrar).not.toBeNull();

    await servicio.from("formatos").delete().eq("id", formato!.id);
  });

  it("el dueño puede crear, editar y borrar un formato", async () => {
    const { data, error: errorAlta } = await duenio.cliente
      .from("formatos")
      .insert({
        nombre: `Formato de prueba ${Date.now()}`,
        gramos: 250,
        cantidad_sabores: 1,
        precio: 1000,
      })
      .select("id")
      .single();
    expect(errorAlta).toBeNull();

    const { error: errorEdicion } = await duenio.cliente
      .from("formatos")
      .update({ precio: 1200 })
      .eq("id", data!.id);
    expect(errorEdicion).toBeNull();

    const { error: errorBorrado } = await duenio.cliente
      .from("formatos")
      .delete()
      .eq("id", data!.id);
    expect(errorBorrado).toBeNull();
  });

  it("sin sesión no se puede leer formatos", async () => {
    const { data, error } = await anonimo.from("formatos").select("id");
    expect(data).toEqual([]);
    expect(error).toBeNull();
  });
});
