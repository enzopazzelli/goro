"use server";

import { revalidatePath } from "next/cache";
import { clienteServidor } from "@/lib/supabase/servidor";
import { itemsParaServidor } from "../ticket";
import type { Cobrado, ItemDeTicket, MedioPago } from "../tipos";

export type EstadoTicket = {
  error: string | null;
  faltaBalde?: { saborId: number; saborNombre: string; baldeParaAbrir: number | null } | null;
  /** La caja se cerró mientras se armaba el ticket: la pantalla ofrece abrirla sin perder el carrito. */
  cajaCerrada?: boolean;
  /** La venta que acaba de entrar, para el aviso de la pantalla. */
  cobrado?: Cobrado | null;
};

export type EstadoFormulario = { error: string | null };

const SIN_ERROR_SIMPLE: EstadoFormulario = { error: null };

const MEDIOS_VALIDOS: MedioPago[] = ["efectivo", "tarjeta", "transferencia"];

/** Cuando `registrar_venta` avisa que falta un balde abierto, busca uno cerrado para ofrecer abrirlo. */
async function buscarBaldeParaAbrir(
  supabase: Awaited<ReturnType<typeof clienteServidor>>,
  saborId: number,
) {
  const { data: sabor } = await supabase
    .from("sabores")
    .select("nombre")
    .eq("id", saborId)
    .single();
  const { data: baldeCerrado } = await supabase
    .from("baldes")
    .select("id")
    .eq("sabor_id", saborId)
    .eq("estado", "cerrado")
    .order("entro_en")
    .limit(1)
    .maybeSingle();

  return {
    saborId,
    saborNombre: sabor?.nombre ?? "",
    baldeParaAbrir: baldeCerrado?.id ?? null,
  };
}

/**
 * El total lo calcula `registrar_venta` del lado del servidor, así que el aviso
 * de la pantalla lo lee de la venta registrada y no de lo que sumaba el
 * carrito: si un precio cambió mientras se armaba el ticket, el que vale es
 * este, que es el que también quedó en la caja.
 *
 * Si la lectura falla, el aviso sale igual sin monto. Lo que no puede pasar es
 * que quien cobra no se entere de que la venta entró y la cobre de nuevo.
 */
async function leerCobrado(
  supabase: Awaited<ReturnType<typeof clienteServidor>>,
  ventaId: number,
  medioPago: MedioPago,
): Promise<Cobrado> {
  const { data } = await supabase.from("ventas").select("total").eq("id", ventaId).maybeSingle();
  const venta = data as { total: number } | null;

  return { ventaId, total: venta ? Number(venta.total) : null, medioPago };
}

export async function registrarVenta(
  _previo: EstadoTicket,
  datos: FormData,
): Promise<EstadoTicket> {
  const medioPago = String(datos.get("medioPago") ?? "") as MedioPago;
  if (!MEDIOS_VALIDOS.includes(medioPago)) return { error: "Elegí un medio de pago." };

  let items: ItemDeTicket[];
  try {
    items = JSON.parse(String(datos.get("items") ?? "[]"));
  } catch {
    return { error: "El ticket quedó mal armado, probá de nuevo." };
  }
  if (!Array.isArray(items) || items.length === 0) {
    return { error: "Agregá al menos un item al ticket." };
  }

  const supabase = await clienteServidor();
  const { data: ventaId, error } = await supabase.rpc("registrar_venta", {
    p_items: itemsParaServidor(items),
    p_medio_pago: medioPago,
  });

  if (error) {
    if (error.hint === "sin_balde_abierto") {
      const faltaBalde = await buscarBaldeParaAbrir(supabase, Number(error.details));
      return { error: error.message, faltaBalde };
    }
    if (error.hint === "caja_cerrada") return { error: error.message, cajaCerrada: true };
    return { error: error.message };
  }

  revalidatePath("/ventas");
  return { error: null, cobrado: await leerCobrado(supabase, Number(ventaId), medioPago) };
}

export async function anularVenta(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const ventaId = Number(datos.get("ventaId"));
  if (!Number.isInteger(ventaId) || ventaId <= 0) return { error: "Venta inválida." };

  const supabase = await clienteServidor();
  const { error } = await supabase.rpc("anular_venta", { p_venta_id: ventaId });

  if (error) return { error: error.message };

  revalidatePath("/ventas");
  return SIN_ERROR_SIMPLE;
}

export async function corregirSaborVentaItem(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const ventaItemId = Number(datos.get("ventaItemId"));
  const saborViejoId = Number(datos.get("saborViejoId"));
  const saborNuevoId = Number(datos.get("saborNuevoId"));

  if (!Number.isInteger(ventaItemId) || ventaItemId <= 0) return { error: "Item inválido." };
  if (!Number.isInteger(saborNuevoId) || saborNuevoId <= 0) return { error: "Elegí un sabor." };

  const supabase = await clienteServidor();
  const { error } = await supabase.rpc("corregir_sabor_venta_item", {
    p_venta_item_id: ventaItemId,
    p_sabor_viejo_id: saborViejoId,
    p_sabor_nuevo_id: saborNuevoId,
  });

  if (error) return { error: error.message };

  revalidatePath("/ventas");
  return SIN_ERROR_SIMPLE;
}
