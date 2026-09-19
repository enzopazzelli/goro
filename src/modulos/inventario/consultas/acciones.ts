"use server";

import { revalidatePath } from "next/cache";
import { generarCodigo } from "@/lib/codigos/codigo";
import { clienteServidor } from "@/lib/supabase/servidor";

export type EstadoFormulario = { error: string | null };

const SIN_ERROR: EstadoFormulario = { error: null };

/** RLS es la barrera real (solo dueño); acá solo se arma un mensaje si falla. */
export async function crearSabor(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const nombre = String(datos.get("nombre") ?? "").trim();
  if (!nombre) return { error: "Escribí un nombre." };

  const supabase = await clienteServidor();
  const { error } = await supabase.from("sabores").insert({ nombre });

  if (error) {
    if (error.code === "23505") return { error: `Ya existe un sabor "${nombre}".` };
    return { error: "No se pudo crear el sabor." };
  }

  revalidatePath("/inventario");
  return SIN_ERROR;
}

/** `valor` vacío = volver a usar el mínimo por defecto del comercio. */
export async function editarStockMinimo(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const saborId = Number(datos.get("saborId"));
  const valor = String(datos.get("stockMinimo") ?? "").trim();

  if (valor !== "" && (!Number.isFinite(Number(valor)) || Number(valor) < 0)) {
    return { error: "El mínimo tiene que ser un número positivo, o vacío para el default." };
  }

  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("sabores")
    .update({ stock_minimo: valor === "" ? null : Number(valor) })
    .eq("id", saborId);

  if (error) return { error: "No se pudo guardar el mínimo." };

  revalidatePath("/inventario");
  return SIN_ERROR;
}

/** Validaciones de `crearInsumo`, separadas para no pasar el límite de complejidad del linter. */
function validarDatosInsumo(
  nombre: string,
  unidad: string,
  minimo: number,
  costo: number,
): string | null {
  if (!nombre) return "Escribí un nombre.";
  if (unidad !== "u" && unidad !== "kg") return "Elegí una unidad.";
  if (!Number.isFinite(minimo) || minimo < 0) return "El mínimo tiene que ser un número positivo.";
  if (!Number.isInteger(costo) || costo < 0) {
    return "El costo tiene que ser un número entero positivo.";
  }
  return null;
}

export async function crearInsumo(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const nombre = String(datos.get("nombre") ?? "").trim();
  const unidad = String(datos.get("unidad") ?? "");
  const minimo = Number(datos.get("minimo"));
  const costo = Number(datos.get("costo"));

  const errorValidacion = validarDatosInsumo(nombre, unidad, minimo, costo);
  if (errorValidacion) return { error: errorValidacion };

  const supabase = await clienteServidor();
  const { data: numero, error: errorSecuencia } = await supabase.rpc("siguiente_numero_insumo");
  if (errorSecuencia || numero === null) return { error: "No se pudo generar el código." };

  const codigo = generarCodigo("A", numero);
  const { error } = await supabase
    .from("insumos")
    .insert({ nombre, codigo, unidad, minimo, costo });

  if (error) return { error: "No se pudo crear el insumo." };

  revalidatePath("/inventario");
  return SIN_ERROR;
}

export async function registrarMovimiento(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const insumoId = Number(datos.get("insumoId"));
  const tipo = String(datos.get("tipo") ?? "");
  const cantidadCruda = Number(datos.get("cantidad"));
  const motivo = String(datos.get("motivo") ?? "").trim() || null;

  if (tipo !== "entrada" && tipo !== "ajuste") return { error: "Elegí un tipo de movimiento." };
  if (!Number.isFinite(cantidadCruda) || cantidadCruda === 0) {
    return { error: "La cantidad no puede ser cero." };
  }

  // Una "entrada" siempre suma; el signo de un "ajuste" lo elige quien carga
  // (puede corregir para arriba o para abajo).
  const cantidad = tipo === "entrada" ? Math.abs(cantidadCruda) : cantidadCruda;

  const supabase = await clienteServidor();
  const { error } = await supabase.rpc("registrar_movimiento_insumo", {
    p_insumo_id: insumoId,
    p_tipo: tipo,
    p_cantidad: cantidad,
    p_motivo: motivo,
  });

  if (error) return { error: "No se pudo registrar el movimiento." };

  revalidatePath("/inventario");
  return SIN_ERROR;
}

export async function darDeAltaBalde(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const saborId = Number(datos.get("saborId"));
  const kgInicial = Number(datos.get("kgInicial"));
  const costo = Number(datos.get("costo"));
  const costoEnvase = Number(datos.get("costoEnvase"));

  if (!Number.isInteger(saborId) || saborId <= 0) return { error: "Elegí un sabor." };
  if (!Number.isFinite(kgInicial) || kgInicial <= 0) {
    return { error: "El peso inicial tiene que ser mayor a cero." };
  }
  if (!Number.isInteger(costo) || costo < 0 || !Number.isInteger(costoEnvase) || costoEnvase < 0) {
    return { error: "Costo y costo de envase tienen que ser números enteros positivos." };
  }

  const supabase = await clienteServidor();
  const { data: numero, error: errorSecuencia } = await supabase.rpc("siguiente_numero_balde");
  if (errorSecuencia || numero === null) return { error: "No se pudo generar el código." };

  const codigo = generarCodigo("B", numero);
  const { error } = await supabase.from("baldes").insert({
    codigo,
    sabor_id: saborId,
    kg_inicial: kgInicial,
    kg_restante: kgInicial,
    costo,
    costo_envase: costoEnvase,
  });

  if (error) return { error: "No se pudo dar de alta el balde." };

  revalidatePath("/inventario");
  return SIN_ERROR;
}

export async function abrirBalde(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const baldeId = Number(datos.get("baldeId"));
  if (!Number.isInteger(baldeId) || baldeId <= 0) return { error: "Balde inválido." };

  const supabase = await clienteServidor();
  const { error, count } = await supabase
    .from("baldes")
    .update({ estado: "abierto" }, { count: "exact" })
    .eq("id", baldeId)
    .eq("estado", "cerrado");

  if (error) {
    if (error.code === "23505") return { error: "Ya hay un balde abierto de ese sabor." };
    return { error: "No se pudo abrir el balde." };
  }
  if (!count) return { error: "Ese balde ya no está cerrado." };

  revalidatePath("/inventario");
  return SIN_ERROR;
}
