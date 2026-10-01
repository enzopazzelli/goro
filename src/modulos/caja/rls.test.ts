// @vitest-environment node
// Sin jsdom: ahí los clientes de Supabase comparten localStorage y el cliente de servicio
// termina actuando con la sesión de un usuario de prueba, sujeto a RLS.

import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  borrarTurnoDePrueba,
  clavePublica,
  crearUsuarioDePrueba,
  limpiarVentasDe,
  servicio,
  url,
} from "@/modulos/ventas/utilesRls";
import { resumenDelTurno } from "./resumen";
import type { MovimientoCaja, VentaDelTurno } from "./tipos";

/**
 * Qué NO puede hacer cada rol con la caja, y que el libro cierra. Corre contra
 * un proyecto Supabase de PRUEBA y de a un archivo (`npm run test:rls`): "una
 * sola caja abierta" vale para toda la base.
 *
 * Estos tests ABREN Y CIERRAN la caja. Si encuentran una abierta, se niegan a
 * correr: sería el turno de alguien.
 */

type Usuario = Awaited<ReturnType<typeof crearUsuarioDePrueba>>;

async function movimientosDe(turnoId: number): Promise<MovimientoCaja[]> {
  const { data } = await servicio
    .from("movimientos_caja")
    .select("id, tipo, monto, detalle, venta_id, creado_por, creado_en, anulado_en")
    .eq("turno_id", turnoId)
    .order("id");
  return (data ?? []).map((fila) => ({
    id: fila.id,
    tipo: fila.tipo,
    monto: fila.monto,
    detalle: fila.detalle,
    ventaId: fila.venta_id,
    creadoPor: fila.creado_por,
    creadoEn: fila.creado_en,
    anulado: fila.anulado_en !== null,
  }));
}

async function ventasDe(turnoId: number): Promise<VentaDelTurno[]> {
  const { data } = await servicio
    .from("ventas")
    .select("id, medio_pago, total, estado, creado_en")
    .eq("turno_id", turnoId);
  return (data ?? []).map((fila) => ({
    id: fila.id,
    medioPago: fila.medio_pago,
    total: fila.total,
    estado: fila.estado,
    creadoEn: fila.creado_en,
  }));
}

describe("RLS: caja", () => {
  let colaborador: Usuario;
  let duenio: Usuario;
  let anonimo: ReturnType<typeof createClient>;
  let saborId: number;
  let baldeId: number;
  let formatoId: number;
  let turno1: number;
  let ventaEfectivo: number;
  let ventaTarjeta: number;

  const vender = async (medio: "efectivo" | "tarjeta") => {
    const { data, error } = await colaborador.cliente.rpc("registrar_venta", {
      p_items: [{ formato_id: formatoId, sabor_ids: [saborId] }],
      p_medio_pago: medio,
    });
    if (error) throw error;
    return data as number;
  };

  beforeAll(async () => {
    const { data: abierta } = await servicio
      .from("turnos_caja")
      .select("id")
      .is("cerrado_en", null)
      .maybeSingle();
    if (abierta) {
      throw new Error(
        `Hay una caja abierta (turno ${abierta.id}). Estos tests abren y cierran la caja: no se corren contra una base en uso.`,
      );
    }

    colaborador = await crearUsuarioDePrueba("colaborador");
    duenio = await crearUsuarioDePrueba("duenio");
    anonimo = createClient(url, clavePublica);

    const { data: sabor } = await servicio
      .from("sabores")
      .insert({ nombre: `Sabor de caja ${Date.now()}` })
      .select("id")
      .single();
    saborId = sabor!.id;

    const { data: balde } = await servicio
      .from("baldes")
      .insert({
        codigo: `GB${String(Date.now()).slice(-7)}`,
        sabor_id: saborId,
        kg_inicial: 10,
        kg_restante: 10,
        estado: "abierto",
        costo: 1000,
        costo_envase: 500,
      })
      .select("id")
      .single();
    baldeId = balde!.id;

    const { data: formato } = await servicio
      .from("formatos")
      .insert({
        nombre: `Formato de caja ${Date.now()}`,
        gramos: 250,
        cantidad_sabores: 1,
        precio: 3000,
      })
      .select("id")
      .single();
    formatoId = formato!.id;
  });

  afterAll(async () => {
    // Si el beforeAll se negó a correr (había una caja abierta), no hay nada que limpiar.
    if (!colaborador) return;

    await limpiarVentasDe("formato_id", [formatoId]);
    await servicio.from("movimientos_balde").delete().eq("balde_id", baldeId);
    await servicio.from("baldes").delete().eq("id", baldeId);
    await servicio.from("formatos").delete().eq("id", formatoId);
    await servicio.from("sabores").delete().eq("id", saborId);

    // Por usuario y no por una lista de ids: si un test falló a mitad de
    // camino, su turno igual se encuentra y la caja no queda abierta.
    const { data: turnos } = await servicio
      .from("turnos_caja")
      .select("id")
      .in("abierto_por", [colaborador.id, duenio.id]);
    for (const turno of turnos ?? []) await borrarTurnoDePrueba(turno.id);

    await servicio.auth.admin.deleteUser(colaborador.id);
    await servicio.auth.admin.deleteUser(duenio.id);
  });

  it("sin sesión no se lee nada de la caja", async () => {
    for (const tabla of ["turnos_caja", "movimientos_caja", "arqueos"]) {
      const { data } = await anonimo.from(tabla).select("*");
      expect(data ?? []).toEqual([]);
    }
  });

  it("sin caja abierta no se cobra, y el error avisa con hint caja_cerrada", async () => {
    const { error } = await colaborador.cliente.rpc("registrar_venta", {
      p_items: [{ formato_id: formatoId, sabor_ids: [saborId] }],
      p_medio_pago: "efectivo",
    });
    expect(error?.hint).toBe("caja_cerrada");
  });

  it("dos aperturas simultáneas: gana una sola", async () => {
    const resultados = await Promise.all([
      colaborador.cliente.rpc("abrir_caja", { p_contado: 45000 }),
      duenio.cliente.rpc("abrir_caja", { p_contado: 45000 }),
    ]);
    const errores = resultados.filter((resultado) => resultado.error);
    expect(errores).toHaveLength(1);
    expect(errores[0]!.error!.message).toBe("Ya hay una caja abierta.");

    const { data: abiertos } = await servicio
      .from("turnos_caja")
      .select("id")
      .is("cerrado_en", null);
    expect(abiertos).toHaveLength(1);
    turno1 = abiertos![0]!.id;
  });

  it("nadie escribe directo en las tablas de caja, tampoco el dueño", async () => {
    for (const usuario of [colaborador, duenio]) {
      const movimiento = await usuario.cliente
        .from("movimientos_caja")
        .insert({ turno_id: turno1, tipo: "ingreso", monto: 99999, detalle: "x" });
      expect(movimiento.error).not.toBeNull();

      const turno = await usuario.cliente.from("turnos_caja").insert({ abierto_por: usuario.id });
      expect(turno.error).not.toBeNull();

      const arqueo = await usuario.cliente
        .from("arqueos")
        .insert({ turno_id: turno1, esperado: 0, contado: 0, fondo_que_queda: 0 });
      expect(arqueo.error).not.toBeNull();
    }
  });

  it("una venta en efectivo entra al libro; una con tarjeta lleva turno pero no mueve el cajón", async () => {
    ventaEfectivo = await vender("efectivo");
    ventaTarjeta = await vender("tarjeta");

    const cobros = (await movimientosDe(turno1)).filter((m) => m.tipo === "venta");
    expect(cobros.map((m) => [m.ventaId, m.monto])).toEqual([[ventaEfectivo, 3000]]);

    const { data: ventas } = await servicio
      .from("ventas")
      .select("turno_id")
      .in("id", [ventaEfectivo, ventaTarjeta]);
    expect(ventas!.map((venta) => venta.turno_id)).toEqual([turno1, turno1]);
  });

  it("el signo de un movimiento lo pone la base, no quien lo carga", async () => {
    const cargar = (tipo: string, monto: number) =>
      colaborador.cliente.rpc("registrar_movimiento_caja", {
        p_tipo: tipo,
        p_monto: monto,
        p_detalle: `Prueba de ${tipo}`,
      });

    expect((await cargar("gasto", 12000)).error).toBeNull();
    expect((await cargar("ingreso", 5000)).error).toBeNull();
    expect((await cargar("retiro", 10000)).error).toBeNull();
    // Ni un cobro sin venta detrás, ni un "gasto" que en realidad mete plata.
    expect((await cargar("venta", 100)).error).not.toBeNull();
    expect((await cargar("apertura", 100)).error).not.toBeNull();
    expect((await cargar("gasto", -500)).error).not.toBeNull();

    const manuales = (await movimientosDe(turno1)).filter((m) => m.detalle);
    expect(manuales.map((m) => [m.tipo, m.monto])).toEqual([
      ["gasto", -12000],
      ["ingreso", 5000],
      ["retiro", -10000],
    ]);
  });

  it("un gasto anulado queda en el libro pero no se anula dos veces", async () => {
    const gasto = (await movimientosDe(turno1)).find((m) => m.tipo === "gasto")!;
    const anular = () =>
      colaborador.cliente.rpc("anular_movimiento_caja", { p_movimiento_id: gasto.id });

    expect((await anular()).error).toBeNull();
    expect((await anular()).error?.message).toBe("Ese movimiento ya está anulado.");
    expect((await movimientosDe(turno1)).find((m) => m.id === gasto.id)!.anulado).toBe(true);
  });

  it("cerrar_caja no devuelve nada y congela el mismo esperado que calcula la pantalla", async () => {
    const resumen = resumenDelTurno(await movimientosDe(turno1), await ventasDe(turno1));
    // 45.000 + 3.000 + 5.000 − 10.000; el gasto anulado no cuenta.
    expect(resumen.esperado).toBe(43000);

    const cierre = await colaborador.cliente.rpc("cerrar_caja", {
      p_contado: 42000,
      p_fondo_que_queda: 20000,
    });
    expect(cierre.error).toBeNull();
    expect(cierre.data ?? null).toBeNull();

    const { data: arqueo } = await servicio
      .from("arqueos")
      .select("esperado, contado, diferencia, fondo_que_queda")
      .eq("turno_id", turno1)
      .single();
    expect(arqueo).toEqual({
      esperado: resumen.esperado,
      contado: 42000,
      diferencia: -1000,
      fondo_que_queda: 20000,
    });
  });

  it("arqueo ciego: el colaborador no lee arqueos, el dueño sí", async () => {
    const delColaborador = await colaborador.cliente.from("arqueos").select("turno_id");
    expect(delColaborador.data ?? []).toEqual([]);

    const delDuenio = await duenio.cliente
      .from("arqueos")
      .select("turno_id")
      .eq("turno_id", turno1);
    expect(delDuenio.data).toEqual([{ turno_id: turno1 }]);
  });

  it("con la caja cerrada: una venta en efectivo no se anula, una con tarjeta sí", async () => {
    const efectivo = await colaborador.cliente.rpc("anular_venta", { p_venta_id: ventaEfectivo });
    expect(efectivo.error?.hint).toBe("caja_cerrada");

    const tarjeta = await colaborador.cliente.rpc("anular_venta", { p_venta_id: ventaTarjeta });
    expect(tarjeta.error).toBeNull();
  });

  it("anular una venta de un turno cerrado saca la plata del turno abierto ahora", async () => {
    const { data: turno2, error } = await duenio.cliente.rpc("abrir_caja", { p_contado: 20000 });
    expect(error).toBeNull();

    const anulacion = await colaborador.cliente.rpc("anular_venta", { p_venta_id: ventaEfectivo });
    expect(anulacion.error).toBeNull();

    const devoluciones = (await movimientosDe(turno2 as number)).filter(
      (m) => m.tipo === "anulacion",
    );
    expect(devoluciones.map((m) => [m.ventaId, m.monto])).toEqual([[ventaEfectivo, -3000]]);

    // El arqueo del turno viejo está congelado: no se entera.
    const { data: arqueo } = await servicio
      .from("arqueos")
      .select("esperado")
      .eq("turno_id", turno1)
      .single();
    expect(arqueo!.esperado).toBe(43000);
  });

  it("un movimiento de un turno cerrado ya no se anula", async () => {
    const ingreso = (await movimientosDe(turno1)).find((m) => m.tipo === "ingreso")!;
    const { error } = await colaborador.cliente.rpc("anular_movimiento_caja", {
      p_movimiento_id: ingreso.id,
    });
    expect(error?.message).toBe("Solo se pueden anular movimientos de la caja abierta.");
  });
});
