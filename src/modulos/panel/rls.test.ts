// @vitest-environment node
// Sin jsdom: ahí los clientes de Supabase comparten localStorage y el cliente de servicio
// termina actuando con la sesión de un usuario de prueba, sujeto a RLS.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ZONA_HORARIA } from "@/config/comercio";
import { rangoUtc } from "@/lib/periodos";
import {
  abrirCajaDePrueba,
  borrarTurnoDePrueba,
  clavePublica,
  crearUsuarioDePrueba,
  limpiarVenta,
  limpiarVentasDe,
  servicio,
  url,
} from "@/modulos/ventas/utilesRls";

/** El código de un balde es de UNIDAD: el check de la tabla exige el prefijo GB, no GA. */
const codigoDeBalde = () => `GB${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;

/**
 * Las tres sumas del Panel, contra la base de verdad. Lo que se prueba acá no
 * se puede probar en la pantalla: que la hora sea la del local y no la del
 * servidor, que lo anulado no cuente, y que una corrección de sabor mueva los
 * kilos sin cambiar la plata.
 *
 * Cada caso usa un día propio de 2020, bien lejos de cualquier venta real del
 * proyecto de prueba: así un test no ve lo que hizo otro.
 */
describe("Panel: las sumas del período", () => {
  let colaborador: Awaited<ReturnType<typeof crearUsuarioDePrueba>>;
  let anonimo: SupabaseClient;
  let turnoDePrueba: number | null;
  let formatoId: number;
  let frutillaId: number;
  let chocolateId: number;
  let baldeFrutillaId: number;
  let baldeChocolateId: number;

  async function crearSaborConBalde(nombre: string) {
    const { data: sabor } = await servicio
      .from("sabores")
      .insert({ nombre: `${nombre} de panel ${Date.now()}` })
      .select("id")
      .single();

    const { data: balde } = await servicio
      .from("baldes")
      .insert({
        codigo: codigoDeBalde(),
        sabor_id: sabor!.id,
        kg_inicial: 10,
        kg_restante: 10,
        estado: "abierto",
        costo: 1000,
        costo_envase: 500,
      })
      .select("id")
      .single();

    return { saborId: sabor!.id as number, baldeId: balde!.id as number };
  }

  /** Vende un pote de 250 g del sabor pedido y lo fecha en el día del test. */
  async function venderEn(saborId: number, instante: string) {
    const { data: ventaId, error } = await colaborador.cliente.rpc("registrar_venta", {
      p_items: [{ formato_id: formatoId, sabor_ids: [saborId] }],
      p_medio_pago: "efectivo",
    });
    expect(error).toBeNull();

    // `registrar_venta` usa now(); para probar el agrupamiento por hora hay que
    // poder elegir el instante, y eso solo lo puede hacer la clave de servicio.
    await servicio
      .from("ventas")
      .update({ creado_en: instante })
      .eq("id", ventaId as number);

    return ventaId as number;
  }

  const delDia = (dia: string) => {
    const { desdeIso, hastaIso } = rangoUtc({ desde: dia, hasta: dia });
    return { p_desde: desdeIso, p_hasta: hastaIso };
  };

  beforeAll(async () => {
    colaborador = await crearUsuarioDePrueba("colaborador");
    anonimo = createClient(url, clavePublica);
    turnoDePrueba = await abrirCajaDePrueba(colaborador.cliente);

    ({ saborId: frutillaId, baldeId: baldeFrutillaId } = await crearSaborConBalde("Frutilla"));
    ({ saborId: chocolateId, baldeId: baldeChocolateId } = await crearSaborConBalde("Chocolate"));

    const { data: formato } = await servicio
      .from("formatos")
      .insert({
        nombre: `Formato de panel ${Date.now()}`,
        gramos: 250,
        cantidad_sabores: 1,
        precio: 3000,
      })
      .select("id")
      .single();
    formatoId = formato!.id;
  });

  afterAll(async () => {
    await limpiarVentasDe("formato_id", [formatoId]);
    for (const baldeId of [baldeFrutillaId, baldeChocolateId]) {
      await servicio.from("movimientos_balde").delete().eq("balde_id", baldeId);
      await servicio.from("baldes").delete().eq("id", baldeId);
    }
    await servicio.from("formatos").delete().eq("id", formatoId);
    await servicio.from("sabores").delete().in("id", [frutillaId, chocolateId]);
    await borrarTurnoDePrueba(turnoDePrueba);
    await servicio.auth.admin.deleteUser(colaborador.id);
  });

  it("sin sesión no se puede pedir ninguna de las tres sumas", async () => {
    const rango = delDia("2020-03-15");
    const respuestas = await Promise.all([
      anonimo.rpc("ventas_del_periodo", rango),
      anonimo.rpc("ventas_por_hora", { ...rango, p_zona: ZONA_HORARIA }),
      anonimo.rpc("kilos_por_sabor", rango),
    ]);

    for (const { error } of respuestas) expect(error?.code).toBe("42501");
  });

  it("una venta de las 23:30 UTC cae en la hora 20, que es la del local", async () => {
    const ventaId = await venderEn(frutillaId, "2020-03-15T23:30:00Z");

    const { data } = await colaborador.cliente.rpc("ventas_por_hora", {
      ...delDia("2020-03-15"),
      p_zona: ZONA_HORARIA,
    });

    expect(data).toEqual([{ hora: 20, cantidad: 1, total: 3000 }]);
    await limpiarVenta(ventaId);
  });

  it("lo anulado no cuenta en ninguna de las tres sumas", async () => {
    const ventaId = await venderEn(frutillaId, "2020-03-16T18:00:00Z");
    const rango = delDia("2020-03-16");

    const { error } = await colaborador.cliente.rpc("anular_venta", { p_venta_id: ventaId });
    expect(error).toBeNull();

    const [medios, horas, sabores] = await Promise.all([
      colaborador.cliente.rpc("ventas_del_periodo", rango),
      colaborador.cliente.rpc("ventas_por_hora", { ...rango, p_zona: ZONA_HORARIA }),
      colaborador.cliente.rpc("kilos_por_sabor", rango),
    ]);

    expect(medios.data).toEqual([]);
    expect(horas.data).toEqual([]);
    expect(sabores.data).toEqual([]);

    await limpiarVenta(ventaId);
  });

  it("una corrección de sabor mueve los kilos y no toca la plata", async () => {
    const ventaId = await venderEn(frutillaId, "2020-03-17T18:00:00Z");
    const rango = delDia("2020-03-17");

    const { data: items } = await servicio.from("venta_items").select("id").eq("venta_id", ventaId);

    const { error } = await colaborador.cliente.rpc("corregir_sabor_venta_item", {
      p_venta_item_id: items![0]!.id,
      p_sabor_viejo_id: frutillaId,
      p_sabor_nuevo_id: chocolateId,
    });
    expect(error).toBeNull();

    const { data: sabores } = await colaborador.cliente.rpc("kilos_por_sabor", rango);
    const { data: medios } = await colaborador.cliente.rpc("ventas_del_periodo", rango);

    // Frutilla quedó en cero neto y desaparece del ranking; el pote se cobró igual.
    expect(sabores).toEqual([
      { sabor_id: chocolateId, sabor_nombre: expect.any(String), kg: 0.25 },
    ]);
    expect(medios).toEqual([{ medio_pago: "efectivo", cantidad: 1, total: 3000 }]);

    await limpiarVenta(ventaId);
  });
});
