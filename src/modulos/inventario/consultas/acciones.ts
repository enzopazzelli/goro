"use server";

import { revalidatePath } from "next/cache";
import { generarCodigo } from "@/lib/codigos/codigo";
import { clienteServidor } from "@/lib/supabase/servidor";

export type EstadoFormulario = { error: string | null };

const SIN_ERROR: EstadoFormulario = { error: null };

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

/** Corrige kg_restante a fin de día, cuando la estimación de una venta no coincidió con la realidad. */
export async function registrarAjusteBalde(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const baldeId = Number(datos.get("baldeId"));
  const kg = Number(datos.get("kg"));

  if (!Number.isInteger(baldeId) || baldeId <= 0) return { error: "Balde inválido." };
  if (!Number.isFinite(kg) || kg === 0) return { error: "El ajuste no puede ser cero." };

  const supabase = await clienteServidor();
  const { error } = await supabase.rpc("registrar_ajuste_balde", { p_balde_id: baldeId, p_kg: kg });

  if (error) {
    if (error.code === "23514") return { error: "Ese ajuste deja el balde fuera de rango." };
    return { error: "No se pudo ajustar el balde." };
  }

  revalidatePath("/inventario");
  return SIN_ERROR;
}

/** Solo se puede borrar un balde 'cerrado' — la política de RLS es la barrera real. */
export async function eliminarBalde(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const baldeId = Number(datos.get("baldeId"));
  if (!Number.isInteger(baldeId) || baldeId <= 0) return { error: "Balde inválido." };

  const supabase = await clienteServidor();
  const { error, count } = await supabase
    .from("baldes")
    .delete({ count: "exact" })
    .eq("id", baldeId)
    .eq("estado", "cerrado");

  if (error) {
    if (error.code === "23503")
      return { error: "No se puede borrar: ya tiene movimientos cargados." };
    return { error: "No se pudo borrar el balde." };
  }
  if (!count) return { error: "Ese balde ya no está cerrado." };

  revalidatePath("/inventario");
  return SIN_ERROR;
}
