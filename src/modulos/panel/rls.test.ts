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
  codigoDePrueba,
  crearUsuarioDePrueba,
  limpiarVenta,
  limpiarVentasDe,
  servicio,
  url,
} from "@/modulos/ventas/utilesRls";

/** El código de un balde es de UNIDAD: el check de la tabla exige el prefijo GB, no GA. */
const codigoDeBalde = () => `GB${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;

/**
 * Las sumas del Panel, contra la base de verdad. Lo que se prueba acá no se
 * puede probar en la pantalla: que el día y la hora sean los del local y no los
 * del servidor, que lo anulado no cuente, y que una corrección de sabor mueva
 * los kilos y su costo sin tocar la plata.
 *
 * Cada caso usa un día propio de 2020, bien lejos de cualquier venta real del
 * proyecto de prueba: así un test no ve lo que hizo otro.
 *
 * Los números salen de este fixture: el balde de Frutilla cuesta $1.000 por 10
 * kg ($100 el kilo) y el de Chocolate $2.000 por 10 kg ($200 el kilo); el
 * formato es de 250 g a $3.000 y lleva un envase propio de $300.
 */
describe("Panel: las sumas del período", () => {
  let colaborador: Awaited<ReturnType<typeof crearUsuarioDePrueba>>;
  let anonimo: SupabaseClient;
  let turnoDePrueba: number | null;
  let formatoId: number;
  let envaseId: number;
  let frutillaId: number;
  let chocolateId: number;
  let baldeFrutillaId: number;
  let baldeChocolateId: number;

  async function crearSaborConBalde(nombre: string, costo: number) {
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
        costo,
        // El envase del balde no entra en el costo de lo vendido: vuelve al
        // proveedor. Va bien alto a propósito, para que se note si entrara.
        costo_envase: 90000,
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

    // `registrar_venta` usa now(); para probar el agrupamiento por día y por
    // hora hay que poder elegir el instante, y eso solo puede la clave de servicio.
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

    ({ saborId: frutillaId, baldeId: baldeFrutillaId } = await crearSaborConBalde(
      "Frutilla",
      1000,
    ));
    ({ saborId: chocolateId, baldeId: baldeChocolateId } = await crearSaborConBalde(
      "Chocolate",
      2000,
    ));

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

    // El envase propio del formato: cada venta consume uno, y su costo es lo que
    // hace que `costo_insumos` no sea cero.
    const { data: envase } = await servicio
      .from("insumos")
      .insert({
        nombre: `Vasito de panel ${Date.now()}`,
        codigo: codigoDePrueba(),
        unidad: "u",
        tipo: "envase",
        formato_id: formatoId,
        cantidad: 100,
        minimo: 0,
        costo: 300,
      })
      .select("id")
      .single();
    envaseId = envase!.id;
  });

  afterAll(async () => {
    await limpiarVentasDe("formato_id", [formatoId]);
    // Las anulaciones dejan movimientos sin venta_item_id que limpiarVenta no
    // ve, y sin sacarlos las foreign keys no dejan borrar nada de lo de arriba.
    await servicio.from("movimientos_insumo").delete().eq("insumo_id", envaseId);
    await servicio.from("insumos").delete().eq("id", envaseId);
    for (const baldeId of [baldeFrutillaId, baldeChocolateId]) {
      await servicio.from("movimientos_balde").delete().eq("balde_id", baldeId);
      await servicio.from("baldes").delete().eq("id", baldeId);
    }
    await servicio.from("formatos").delete().eq("id", formatoId);
    await servicio.from("sabores").delete().in("id", [frutillaId, chocolateId]);
    await borrarTurnoDePrueba(turnoDePrueba);
    await servicio.auth.admin.deleteUser(colaborador.id);
  });

  it("sin sesión no se puede pedir ninguna de las sumas", async () => {
    const rango = delDia("2020-03-15");
    const respuestas = await Promise.all([
      anonimo.rpc("ventas_del_periodo", rango),
      anonimo.rpc("ventas_por_hora", { ...rango, p_zona: ZONA_HORARIA }),
      anonimo.rpc("kilos_por_sabor", rango),
      anonimo.rpc("ventas_por_dia", { ...rango, p_zona: ZONA_HORARIA }),
      anonimo.rpc("unidades_por_articulo", rango),
      anonimo.rpc("costo_de_lo_vendido", rango),
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

  it("una venta de las 02:00 UTC es del día anterior para el local", async () => {
    // Las 02:00 del 18 en UTC son las 23:00 del 17 acá: la venta es del 17. Si
    // el día se calculara en UTC, aparecería en el 18.
    const ventaId = await venderEn(frutillaId, "2020-03-18T02:00:00Z");

    const { data } = await colaborador.cliente.rpc("ventas_por_dia", {
      ...delDia("2020-03-17"),
      p_zona: ZONA_HORARIA,
    });

    expect(data).toEqual([{ dia: "2020-03-17", cantidad: 1, total: 3000 }]);
    await limpiarVenta(ventaId);
  });

  it("lo anulado no cuenta en ninguna de las sumas", async () => {
    const ventaId = await venderEn(frutillaId, "2020-03-16T18:00:00Z");
    const rango = delDia("2020-03-16");

    const { error } = await colaborador.cliente.rpc("anular_venta", { p_venta_id: ventaId });
    expect(error).toBeNull();

    const [medios, horas, sabores, dias, articulos, costos] = await Promise.all([
      colaborador.cliente.rpc("ventas_del_periodo", rango),
      colaborador.cliente.rpc("ventas_por_hora", { ...rango, p_zona: ZONA_HORARIA }),
      colaborador.cliente.rpc("kilos_por_sabor", rango),
      colaborador.cliente.rpc("ventas_por_dia", { ...rango, p_zona: ZONA_HORARIA }),
      colaborador.cliente.rpc("unidades_por_articulo", rango),
      colaborador.cliente.rpc("costo_de_lo_vendido", rango),
    ]);

    expect(medios.data).toEqual([]);
    expect(horas.data).toEqual([]);
    expect(sabores.data).toEqual([]);
    expect(dias.data).toEqual([]);
    expect(articulos.data).toEqual([]);
    expect(costos.data).toEqual([{ costo_helado: 0, costo_insumos: 0, costo_envases: 0 }]);

    await limpiarVenta(ventaId);
  });

  it("dos potes iguales son dos unidades del mismo artículo", async () => {
    const primera = await venderEn(frutillaId, "2020-03-19T18:00:00Z");
    const segunda = await venderEn(frutillaId, "2020-03-19T19:00:00Z");

    const { data } = await colaborador.cliente.rpc("unidades_por_articulo", delDia("2020-03-19"));

    expect(data).toEqual([
      {
        formato_nombre: expect.stringContaining("Formato de panel"),
        presentacion_nombre: null,
        presentacion_unidades: null,
        insumo_nombre: null,
        balde_sabor_nombre: null,
        pote_formato_nombre: null,
        pote_sabor_nombre: null,
        unidades: 2,
        total: 6000,
      },
    ]);

    await limpiarVenta(primera);
    await limpiarVenta(segunda);
  });

  it("el helado se valúa al costo del balde que salió, y el envase del balde no cuenta", async () => {
    const ventaId = await venderEn(frutillaId, "2020-03-20T18:00:00Z");

    const { data } = await colaborador.cliente.rpc("costo_de_lo_vendido", delDia("2020-03-20"));

    // 250 g de un balde de $100 el kilo son $25, más un envase de $300. El
    // costo_envase de $90.000 del balde no aparece en ninguno de los dos.
    expect(Number(data![0].costo_helado)).toBeCloseTo(25);
    expect(Number(data![0].costo_insumos)).toBeCloseTo(300);

    await limpiarVenta(ventaId);
  });

  it("subir el costo de un insumo no cambia el margen de lo que ya se vendió", async () => {
    const ventaId = await venderEn(frutillaId, "2020-03-22T18:00:00Z");
    const rango = delDia("2020-03-22");

    const { data: antes } = await colaborador.cliente.rpc("costo_de_lo_vendido", rango);
    expect(Number(antes![0].costo_insumos)).toBeCloseTo(300);

    // Goro sube el vasito de $300 a $999: la venta de esa fecha sigue costando $300.
    await servicio.from("insumos").update({ costo: 999 }).eq("id", envaseId);
    const { data: despues } = await colaborador.cliente.rpc("costo_de_lo_vendido", rango);
    await servicio.from("insumos").update({ costo: 300 }).eq("id", envaseId);

    expect(Number(despues![0].costo_insumos)).toBeCloseTo(300);
    await limpiarVenta(ventaId);
  });

  it("una corrección de sabor mueve los kilos y su costo, y no toca la plata", async () => {
    const ventaId = await venderEn(frutillaId, "2020-03-21T18:00:00Z");
    const rango = delDia("2020-03-21");

    const { data: items } = await servicio.from("venta_items").select("id").eq("venta_id", ventaId);

    const { error } = await colaborador.cliente.rpc("corregir_sabor_venta_item", {
      p_venta_item_id: items![0]!.id,
      p_sabor_viejo_id: frutillaId,
      p_sabor_nuevo_id: chocolateId,
    });
    expect(error).toBeNull();

    const { data: sabores } = await colaborador.cliente.rpc("kilos_por_sabor", rango);
    const { data: medios } = await colaborador.cliente.rpc("ventas_del_periodo", rango);
    const { data: costos } = await colaborador.cliente.rpc("costo_de_lo_vendido", rango);

    // Frutilla quedó en cero neto y desaparece del ranking; el pote se cobró igual.
    expect(sabores).toEqual([
      { sabor_id: chocolateId, sabor_nombre: expect.any(String), kg: 0.25 },
    ]);
    expect(medios).toEqual([{ medio_pago: "efectivo", cantidad: 1, total: 3000 }]);
    // Y el costo pasa a ser el del balde de Chocolate: $200 el kilo, no $100.
    expect(Number(costos![0].costo_helado)).toBeCloseTo(50);

    await limpiarVenta(ventaId);
  });
});
