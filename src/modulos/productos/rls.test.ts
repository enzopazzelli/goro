// @vitest-environment node
// Sin jsdom: ahí los clientes de Supabase comparten localStorage y el cliente de servicio
// termina actuando con la sesión de un usuario de prueba, sujeto a RLS.
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { leerCodigo } from "@/lib/codigos/codigo";

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

describe("Productos y envases", () => {
  let duenio: Awaited<ReturnType<typeof crearUsuarioDePrueba>>;
  let colaborador: Awaited<ReturnType<typeof crearUsuarioDePrueba>>;
  let formatoId: number;
  let nombreFormato: string;
  const creados: number[] = [];

  beforeAll(async () => {
    duenio = await crearUsuarioDePrueba("duenio");
    colaborador = await crearUsuarioDePrueba("colaborador");

    nombreFormato = `Formato de prueba ${Date.now()}`;
    const { data: formato } = await servicio
      .from("formatos")
      .insert({ nombre: nombreFormato, gramos: 130, cantidad_sabores: 2, precio: 0 })
      .select("id")
      .single();
    formatoId = formato!.id;
  });

  afterAll(async () => {
    await servicio.from("movimientos_insumo").delete().in("insumo_id", creados);
    await servicio.from("presentaciones_insumo").delete().in("insumo_id", creados);
    await servicio.from("insumos").delete().in("id", creados);
    await servicio.from("formatos").delete().eq("id", formatoId);
    await servicio.auth.admin.deleteUser(duenio.id);
    await servicio.auth.admin.deleteUser(colaborador.id);
  });

  it("un colaborador no puede crear un producto", async () => {
    const { error } = await colaborador.cliente.rpc("crear_producto", {
      p_nombre: `Producto ajeno ${Date.now()}`,
      p_costo: 100,
    });
    expect(error?.message).toMatch(/Solo el dueño/);
  });

  it("el dueño crea un producto con código válido, dos presentaciones inactivas y su stock", async () => {
    const { data: id, error } = await duenio.cliente.rpc("crear_producto", {
      p_nombre: `Producto de prueba ${Date.now()}`,
      p_costo: 120,
      p_cantidad_inicial: 20,
    });
    expect(error).toBeNull();
    creados.push(id as number);

    const { data: insumo } = await servicio.from("insumos").select("*").eq("id", id).single();
    expect(insumo!.tipo).toBe("producto");
    expect(insumo!.formato_id).toBeNull();
    expect(Number(insumo!.cantidad)).toBe(20);
    // El verificador calculado en SQL tiene que ser el mismo que el de TypeScript.
    expect(leerCodigo(insumo!.codigo)).not.toBeNull();

    const { data: presentaciones } = await servicio
      .from("presentaciones_insumo")
      .select("unidades, precio, activo")
      .eq("insumo_id", id)
      .order("unidades");
    expect(presentaciones).toEqual([
      { unidades: 1, precio: 0, activo: false },
      { unidades: 12, precio: 0, activo: false },
    ]);
  });

  it("no se repite el nombre de un producto", async () => {
    const nombre = `Producto repetido ${Date.now()}`;
    const { data: id } = await duenio.cliente.rpc("crear_producto", {
      p_nombre: nombre,
      p_costo: 1,
    });
    creados.push(id as number);

    const { error } = await duenio.cliente.rpc("crear_producto", { p_nombre: nombre, p_costo: 1 });
    expect(error?.code).toBe("23505");
  });

  it("un colaborador no puede crear el envase de un formato", async () => {
    const { error } = await colaborador.cliente.rpc("crear_envase_de_formato", {
      p_formato_id: formatoId,
    });
    expect(error?.message).toMatch(/Solo el dueño/);
  });

  it("el dueño crea el envase de un formato, y un formato tiene uno solo", async () => {
    const { data: id, error } = await duenio.cliente.rpc("crear_envase_de_formato", {
      p_formato_id: formatoId,
    });
    expect(error).toBeNull();
    creados.push(id as number);

    const { data: envase } = await servicio.from("insumos").select("*").eq("id", id).single();
    expect(envase!.tipo).toBe("envase");
    expect(envase!.formato_id).toBe(formatoId);
    expect(envase!.nombre).toBe(`${nombreFormato} (sin helado)`);

    const { error: segundo } = await duenio.cliente.rpc("crear_envase_de_formato", {
      p_formato_id: formatoId,
    });
    expect(segundo?.message).toMatch(/ya tiene envase/);
  });

  it("un formato con envase no se puede borrar: se desactiva", async () => {
    const { error } = await servicio.from("formatos").delete().eq("id", formatoId);
    expect(error?.code).toBe("23503");
  });

  it("el tipo de un insumo no se cambia, ni siendo dueño", async () => {
    const { data: id } = await duenio.cliente.rpc("crear_producto", {
      p_nombre: `Producto fijo ${Date.now()}`,
      p_costo: 1,
    });
    creados.push(id as number);

    const { error } = await duenio.cliente.from("insumos").update({ tipo: "insumo" }).eq("id", id);
    expect(error?.code).toBe("42501");
  });

  it("la base exige que solo un envase tenga formato, y que todo envase lo tenga", async () => {
    const base = { unidad: "u", minimo: 0, costo: 0 };
    const { error: sinFormato } = await servicio.from("insumos").insert({
      ...base,
      nombre: `Envase suelto ${Date.now()}`,
      codigo: `GA${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`,
      tipo: "envase",
    });
    expect(sinFormato?.code).toBe("23514");

    const { error: productoConFormato } = await servicio.from("insumos").insert({
      ...base,
      nombre: `Producto con formato ${Date.now()}`,
      codigo: `GA${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`,
      tipo: "producto",
      formato_id: formatoId,
    });
    expect(productoConFormato?.code).toBe("23514");
  });

  it("las funciones internas no se pueden llamar por RPC directo", async () => {
    const { error: crear } = await colaborador.cliente.rpc("crear_articulo", {
      p_nombre: "Colado",
      p_tipo: "producto",
      p_costo: 1,
    });
    expect(crear?.code).toBe("42501");

    const { error: movimiento } = await colaborador.cliente.rpc("aplicar_movimiento_insumo", {
      p_insumo_id: creados[0],
      p_tipo: "ajuste",
      p_cantidad: 1,
      p_venta_item_id: null,
    });
    expect(movimiento?.code).toBe("42501");
  });
});
