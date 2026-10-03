// @vitest-environment node
// Sin jsdom: ahí los clientes de Supabase comparten localStorage y el cliente de servicio
// termina actuando con la sesión de un usuario de prueba, sujeto a RLS.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  abrirCajaDePrueba,
  borrarTurnoDePrueba,
  crearUsuarioDePrueba,
  kgDe,
  limpiarVenta,
  limpiarVentasDe,
  servicio,
} from "@/modulos/ventas/utilesRls";

const codigoDeBalde = () => `GB${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
const DIA = "2020-04-01";
const MEDIODIA = "2020-04-01T15:00:00Z";

/**
 * El ciclo del balde contra la base de verdad: las dos puertas (se termina y se
 * canjea, o se vende entero), que nadie salte los pasos, y lo que cuesta cada
 * una en el Panel.
 *
 * Fixture: un balde de $1.000 por 10 kg con un envase de $500. Cada caso
 * trabaja con su propio balde para no depender del orden.
 */
describe("Ciclo del balde", () => {
  let colaborador: Awaited<ReturnType<typeof crearUsuarioDePrueba>>;
  let turnoDePrueba: number | null;
  let saborId: number;
  let precioPrevio: number | null;
  const baldesCreados: number[] = [];

  async function crearBalde(estado: "cerrado" | "abierto", kg = 10) {
    // Solo puede haber un balde abierto por sabor: el que dejó un caso anterior se aparta.
    if (estado === "abierto") await apartarBaldes("abierto");
    const { data } = await servicio
      .from("baldes")
      .insert({
        codigo: codigoDeBalde(),
        sabor_id: saborId,
        kg_inicial: 10,
        kg_restante: kg,
        estado,
        costo: 1000,
        costo_envase: 500,
      })
      .select("id")
      .single();
    baldesCreados.push(data!.id);
    return data!.id as number;
  }

  const ponerPrecios = (porDefecto: number | null, propio: number | null) =>
    Promise.all([
      servicio.from("config_comercio").update({ precio_balde_default: porDefecto }).eq("id", true),
      servicio.from("sabores").update({ precio_balde: propio }).eq("id", saborId),
    ]);

  const venderEntero = (clave?: string) =>
    colaborador.cliente.rpc("registrar_venta", {
      p_items: [{ balde_sabor_id: saborId }],
      p_medio_pago: "tarjeta",
      ...(clave ? { p_clave: clave } : {}),
    });

  /**
   * Saca del circuito a los baldes que dejaron los casos anteriores. No se borran:
   * los que ya se vendieron y anularon tienen movimientos, y la foreign key lo impide.
   */
  const apartarBaldes = (estado: "cerrado" | "abierto") =>
    servicio
      .from("baldes")
      .update({ estado: "canjeado", salio_en: new Date().toISOString() })
      .eq("sabor_id", saborId)
      .eq("estado", estado);

  const estadoDe = async (baldeId: number) => {
    const { data } = await servicio
      .from("baldes")
      .select("estado, salio_en, kg_restante")
      .eq("id", baldeId)
      .single();
    return data!;
  };

  beforeAll(async () => {
    colaborador = await crearUsuarioDePrueba("colaborador");
    turnoDePrueba = await abrirCajaDePrueba(colaborador.cliente);

    const { data: sabor } = await servicio
      .from("sabores")
      .insert({ nombre: `Sabor de ciclo ${Date.now()}` })
      .select("id")
      .single();
    saborId = sabor!.id;

    const { data: config } = await servicio
      .from("config_comercio")
      .select("precio_balde_default")
      .single();
    precioPrevio = config!.precio_balde_default;
  });

  afterAll(async () => {
    await limpiarVentasDe("balde_id", baldesCreados);
    await servicio.from("movimientos_balde").delete().in("balde_id", baldesCreados);
    await servicio.from("baldes").delete().in("id", baldesCreados);
    await servicio.from("sabores").delete().eq("id", saborId);
    await servicio
      .from("config_comercio")
      .update({ precio_balde_default: precioPrevio })
      .eq("id", true);
    await borrarTurnoDePrueba(turnoDePrueba);
    await servicio.auth.admin.deleteUser(colaborador.id);
  });

  it("vender un balde entero: lo cobra al precio del comercio, lo da por vendido y vacía sus kilos", async () => {
    await ponerPrecios(85000, null);
    const baldeId = await crearBalde("cerrado");

    const { data: ventaId, error } = await venderEntero();
    expect(error).toBeNull();

    const { data: venta } = await servicio
      .from("ventas")
      .select("total")
      .eq("id", ventaId)
      .single();
    expect(venta!.total).toBe(85000);

    const balde = await estadoDe(baldeId);
    expect(balde.estado).toBe("vendido");
    expect(balde.salio_en).not.toBeNull();
    expect(Number(balde.kg_restante)).toBe(0);

    // El helado sale por el ledger como cualquier venta: -10 kg ligados al item.
    const { data: item } = await servicio
      .from("venta_items")
      .select("id, balde_id")
      .eq("venta_id", ventaId)
      .single();
    expect(item!.balde_id).toBe(baldeId);
    const { data: movimientos } = await servicio
      .from("movimientos_balde")
      .select("kg, tipo")
      .eq("venta_item_id", item!.id);
    expect(movimientos!.map((m) => ({ kg: Number(m.kg), tipo: m.tipo }))).toEqual([
      { kg: -10, tipo: "venta" },
    ]);

    await limpiarVenta(ventaId as number);
  });

  it("el precio propio del sabor pisa el del comercio", async () => {
    await ponerPrecios(85000, 90000);
    await crearBalde("cerrado");

    const { data: ventaId } = await venderEntero();
    const { data: venta } = await servicio
      .from("ventas")
      .select("total")
      .eq("id", ventaId)
      .single();
    expect(venta!.total).toBe(90000);

    await limpiarVenta(ventaId as number);
  });

  it("sin ningún precio no se vende, y lo dice con un aviso que la pantalla entiende", async () => {
    await ponerPrecios(null, null);
    await crearBalde("cerrado");

    const { error } = await venderEntero();
    expect(error?.hint).toBe("sin_precio_balde");
  });

  it("solo se vende un balde cerrado: uno abierto o inexistente no", async () => {
    await ponerPrecios(85000, null);
    // Mientras el sabor no tenga ninguno cerrado, aunque tenga uno abierto.
    await apartarBaldes("cerrado");
    await crearBalde("abierto");

    const { error } = await venderEntero();
    expect(error?.hint).toBe("sin_balde_cerrado");
    await apartarBaldes("abierto");
  });

  it("anular la venta devuelve el balde a la cámara con todos sus kilos", async () => {
    await ponerPrecios(85000, null);
    const baldeId = await crearBalde("cerrado");
    const { data: ventaId } = await venderEntero();

    const { error } = await colaborador.cliente.rpc("anular_venta", { p_venta_id: ventaId });
    expect(error).toBeNull();

    const balde = await estadoDe(baldeId);
    expect(balde.estado).toBe("cerrado");
    expect(balde.salio_en).toBeNull();
    expect(await kgDe(baldeId)).toBe(10);

    await limpiarVenta(ventaId as number);
  });

  it("un balde entero no tiene sabores para corregir", async () => {
    await ponerPrecios(85000, null);
    await crearBalde("cerrado");
    const { data: ventaId } = await venderEntero();
    const { data: item } = await servicio
      .from("venta_items")
      .select("id")
      .eq("venta_id", ventaId)
      .single();

    const { error } = await colaborador.cliente.rpc("corregir_sabor_venta_item", {
      p_venta_item_id: item!.id,
      p_sabor_viejo_id: saborId,
      p_sabor_nuevo_id: saborId + 1,
    });
    expect(error?.message).toContain("no tiene sabores para corregir");

    await colaborador.cliente.rpc("anular_venta", { p_venta_id: ventaId });
    await limpiarVenta(ventaId as number);
  });

  it("dos ventas a la vez de un solo balde cerrado: una entra y la otra avisa", async () => {
    await ponerPrecios(85000, null);
    await apartarBaldes("cerrado");
    const baldeId = await crearBalde("cerrado");

    const [a, b] = await Promise.all([
      venderEntero(crypto.randomUUID()),
      venderEntero(crypto.randomUUID()),
    ]);

    const salieron = [a, b].filter((respuesta) => !respuesta.error);
    expect(salieron).toHaveLength(1);
    expect([a, b].find((respuesta) => respuesta.error)?.error?.hint).toBe("sin_balde_cerrado");
    expect((await estadoDe(baldeId)).estado).toBe("vendido");

    await colaborador.cliente.rpc("anular_venta", { p_venta_id: salieron[0]!.data });
    await limpiarVenta(salieron[0]!.data as number);
  });

  it("se terminó el balde abierto: queda vacío y lo que sobraba se da de baja con un ajuste", async () => {
    const baldeId = await crearBalde("abierto", 3.5);

    const { error } = await colaborador.cliente.rpc("vaciar_balde", { p_balde_id: baldeId });
    expect(error).toBeNull();

    const balde = await estadoDe(baldeId);
    expect(balde.estado).toBe("vacio");
    expect(balde.salio_en).not.toBeNull();
    expect(Number(balde.kg_restante)).toBe(0);

    const { data: movimientos } = await servicio
      .from("movimientos_balde")
      .select("kg, tipo")
      .eq("balde_id", baldeId);
    expect(movimientos!.map((m) => ({ kg: Number(m.kg), tipo: m.tipo }))).toEqual([
      { kg: -3.5, tipo: "ajuste" },
    ]);
  });

  it("solo se vacía un balde abierto", async () => {
    const baldeId = await crearBalde("cerrado");

    const { error } = await colaborador.cliente.rpc("vaciar_balde", { p_balde_id: baldeId });
    expect(error?.message).toContain("balde abierto");
    expect((await estadoDe(baldeId)).estado).toBe("cerrado");
  });

  it("canjear: los vacíos pasan a canjeados, y es todo o nada", async () => {
    const vacio1 = await crearBalde("abierto", 0.2);
    await colaborador.cliente.rpc("vaciar_balde", { p_balde_id: vacio1 });
    const vacio2 = await crearBalde("abierto", 0.1);
    await colaborador.cliente.rpc("vaciar_balde", { p_balde_id: vacio2 });
    const cerrado = await crearBalde("cerrado");

    // Uno de los tres no está vacío: no se canjea ninguno.
    const parcial = await colaborador.cliente.rpc("canjear_baldes", {
      p_ids: [vacio1, vacio2, cerrado],
    });
    expect(parcial.error?.message).toContain("ya no está vacío");
    expect((await estadoDe(vacio1)).estado).toBe("vacio");

    const { data: cantidad, error } = await colaborador.cliente.rpc("canjear_baldes", {
      p_ids: [vacio1, vacio2],
    });
    expect(error).toBeNull();
    expect(cantidad).toBe(2);
    expect((await estadoDe(vacio1)).estado).toBe("canjeado");
    expect((await estadoDe(vacio2)).estado).toBe("canjeado");
  });

  it("sin cargar_inventario no se canjea", async () => {
    const baldeId = await crearBalde("abierto", 0.1);
    await colaborador.cliente.rpc("vaciar_balde", { p_balde_id: baldeId });
    await servicio.from("perfiles").update({ permisos: [] }).eq("id", colaborador.id);

    const { error } = await colaborador.cliente.rpc("canjear_baldes", { p_ids: [baldeId] });
    expect(error?.message).toContain("No tenés permiso");
    expect((await estadoDe(baldeId)).estado).toBe("vacio");

    await servicio
      .from("perfiles")
      .update({ permisos: ["anular_ventas", "movimientos_caja", "cargar_inventario"] })
      .eq("id", colaborador.id);
  });

  it("nadie salta los pasos: el estado no se cambia con un update directo", async () => {
    const baldeId = await crearBalde("abierto");

    await colaborador.cliente.from("baldes").update({ estado: "canjeado" }).eq("id", baldeId);
    expect((await estadoDe(baldeId)).estado).toBe("abierto");

    // Y la base misma exige que un balde que salió tenga fecha de salida.
    const { error } = await servicio.from("baldes").update({ estado: "vacio" }).eq("id", baldeId);
    expect(error).not.toBeNull();
  });

  it("el Panel cuenta el envase de un balde vendido y separa las dos puertas", async () => {
    await ponerPrecios(85000, null);
    await apartarBaldes("cerrado");
    const vendido = await crearBalde("cerrado");
    const terminado = await crearBalde("abierto", 0.3);

    const { data: ventaId } = await venderEntero();
    await colaborador.cliente.rpc("vaciar_balde", { p_balde_id: terminado });
    // Para medir un día propio, lejos de lo real: se fecha todo en 2020.
    await servicio.from("ventas").update({ creado_en: MEDIODIA }).eq("id", ventaId);
    await servicio.from("baldes").update({ salio_en: MEDIODIA }).in("id", [vendido, terminado]);

    const rango = { p_desde: `${DIA}T03:00:00Z`, p_hasta: "2020-04-02T03:00:00Z" };
    const { data: costos } = await colaborador.cliente.rpc("costo_de_lo_vendido", rango);
    const { data: baldes } = await colaborador.cliente.rpc("baldes_del_periodo", rango);
    const { data: articulos } = await colaborador.cliente.rpc("unidades_por_articulo", rango);

    // 10 kg a $100 el kilo, y el envase de $500 que se llevó el cliente.
    expect(Number(costos![0].costo_helado)).toBeCloseTo(1000);
    expect(Number(costos![0].costo_envases)).toBe(500);
    expect(baldes).toEqual([
      { estado: "vendido", cantidad: 1, costo_envase: 500 },
      { estado: "vacio", cantidad: 1, costo_envase: 500 },
    ]);
    expect(articulos).toEqual([
      expect.objectContaining({
        balde_sabor_nombre: expect.stringContaining("Sabor de ciclo"),
        unidades: 1,
        total: 85000,
      }),
    ]);

    await colaborador.cliente.rpc("anular_venta", { p_venta_id: ventaId });
    await limpiarVenta(ventaId as number);
  });
});
