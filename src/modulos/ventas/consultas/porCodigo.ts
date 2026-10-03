"use server";

import { leerCodigo } from "@/lib/codigos/codigo";
import { obtenerConfigComercio } from "@/lib/configComercio";
import { etiquetaPresentacion } from "@/lib/etiquetaPresentacion";
import { precioDeBalde } from "@/lib/precioBalde";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { ItemEnCarrito } from "../tipos";

export type ResultadoDeCodigo = { item: ItemEnCarrito } | { error: string };

type Cliente = Awaited<ReturnType<typeof clienteServidor>>;

const NO_ES_DE_ACA = "Ese código no es de este sistema. ¿Lo tipeaste bien?";

async function itemDePote(supabase: Cliente, id: number): Promise<ResultadoDeCodigo> {
  const { data } = await supabase
    .from("potes")
    .select("id, estado, precio, formatos ( nombre ), baldes ( sabores ( nombre ) )")
    .eq("id", id)
    .maybeSingle();
  const pote = data as unknown as {
    id: number;
    estado: string;
    precio: number;
    formatos: { nombre: string } | null;
    baldes: { sabores: { nombre: string } | null } | null;
  } | null;
  if (!pote) return { error: "No encontré ese pote." };

  if (pote.estado !== "impreso") {
    const motivo = { vendido: "ya se vendió", descartado: "se descartó", anulado: "se anuló" };
    return { error: `Ese pote ${motivo[pote.estado as keyof typeof motivo] ?? "ya no está"}.` };
  }

  const sabor = pote.baldes?.sabores?.nombre ?? "";
  return {
    item: {
      tipo: "pote",
      poteId: pote.id,
      nombre: `Pote ${pote.formatos?.nombre ?? ""} · ${sabor}`,
      precio: pote.precio,
      saboresNombres: [sabor],
    },
  };
}

async function itemDeBalde(supabase: Cliente, id: number): Promise<ResultadoDeCodigo> {
  const { data } = await supabase
    .from("baldes")
    .select("id, estado, sabor_id, sabores ( nombre, precio_balde, activo )")
    .eq("id", id)
    .maybeSingle();
  const balde = data as unknown as {
    id: number;
    estado: string;
    sabor_id: number;
    sabores: { nombre: string; precio_balde: number | null; activo: boolean } | null;
  } | null;
  if (!balde?.sabores) return { error: "No encontré ese balde." };

  if (balde.estado === "abierto") {
    return { error: "Ese balde está abierto: se sirve en el mostrador, no se vende entero." };
  }
  if (balde.estado !== "cerrado") return { error: "Ese balde ya no está en el local." };

  const config = await obtenerConfigComercio();
  const precio = precioDeBalde(
    { precioBalde: balde.sabores.precio_balde },
    config.precioBaldeDefault,
  );
  if (precio === null) {
    return { error: `Falta ponerle precio al balde entero de ${balde.sabores.nombre}.` };
  }

  return {
    item: {
      tipo: "balde",
      saborId: balde.sabor_id,
      baldeId: balde.id,
      nombre: `Balde entero · ${balde.sabores.nombre}`,
      precio,
      saboresNombres: [balde.sabores.nombre],
    },
  };
}

/** Escanear un producto es venderlo por unidad: su presentación ×1, la más simple. */
async function itemDeArticulo(supabase: Cliente, id: number): Promise<ResultadoDeCodigo> {
  const { data: insumo } = await supabase
    .from("insumos")
    .select("nombre, tipo, activo")
    .eq("id", id)
    .maybeSingle();
  if (!insumo) return { error: "No encontré ese artículo." };

  if (insumo.tipo === "insumo") {
    return { error: `${insumo.nombre} es un insumo: no se vende, se usa.` };
  }
  if (!insumo.activo) return { error: `${insumo.nombre} no está a la venta.` };

  const { data: presentacion } = await supabase
    .from("presentaciones_insumo")
    .select("id, nombre, unidades, precio")
    .eq("insumo_id", id)
    .eq("unidades", 1)
    .eq("activo", true)
    .maybeSingle();
  if (!presentacion)
    return { error: `${insumo.nombre} no tiene una presentación por unidad a la venta.` };

  return {
    item: {
      tipo: "producto",
      presentacionId: presentacion.id,
      nombre: `${insumo.nombre} · ${etiquetaPresentacion(presentacion.nombre, presentacion.unidades)}`,
      precio: presentacion.precio,
      saboresNombres: [],
    },
  };
}

/**
 * Lo que pasa cuando suena la pistola (o se tipea un código): el texto va a
 * `resolver_codigo`, que contesta qué es, y de acá sale el renglón para el
 * ticket. La pistola no sabe si lo que leyó es un pote, un balde o un
 * producto, y esta pantalla tampoco tiene que saberlo de antemano.
 *
 * El precio sale de la base, nunca del navegador: `registrar_venta` lo vuelve a
 * leer al cobrar, así que lo que se muestra acá es solo la vista previa.
 */
export async function buscarPorCodigo(texto: string): Promise<ResultadoDeCodigo> {
  const limpio = texto.trim();
  if (limpio === "") return { error: "Escribí o escaneá un código." };
  // Un dígito verificador que no cierra es casi siempre un error de tipeo: se
  // dice eso y no "no existe", que mandaría a buscar un código que está bien.
  if (!leerCodigo(limpio)) return { error: NO_ES_DE_ACA };

  const supabase = await clienteServidor();
  const { data, error } = await supabase.rpc("resolver_codigo", { p_texto: limpio });
  if (error) return { error: "No se pudo leer el código. Probá de nuevo." };

  const encontrado = (data as { tipo: string; id: number }[] | null)?.[0];
  if (!encontrado) return { error: "Ese código no está cargado." };

  if (encontrado.tipo === "pote") return itemDePote(supabase, encontrado.id);
  if (encontrado.tipo === "balde") return itemDeBalde(supabase, encontrado.id);
  return itemDeArticulo(supabase, encontrado.id);
}
