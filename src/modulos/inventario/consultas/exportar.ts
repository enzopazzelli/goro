import "server-only";
import { obtenerConfigComercio } from "@/lib/configComercio";
import type { Libro } from "@/lib/excel/libro";
import { listarFormatos } from "@/lib/formatos";
import { leerTodo } from "@/lib/paginar";
import { listarPresentaciones } from "@/lib/presentaciones";
import { listarSabores } from "@/lib/sabores";
import { clienteServidor } from "@/lib/supabase/servidor";
import { libroDeInventario, type BaldeDelLocal } from "../libroDeInventario";
import { listarInsumos } from "./insumos";

type FilaBalde = {
  codigo: string;
  kg_inicial: string;
  kg_restante: string;
  estado: BaldeDelLocal["estado"];
  costo: number;
  costo_envase: number;
  sabores: { nombre: string } | null;
};

/** Los baldes que siguen en el local; los vendidos y canjeados ya se fueron y no son inventario. */
async function baldesDelLocal(): Promise<BaldeDelLocal[]> {
  const supabase = await clienteServidor();
  const filas = await leerTodo<FilaBalde>((desde, hasta) =>
    supabase
      .from("baldes")
      .select("codigo, kg_inicial, kg_restante, estado, costo, costo_envase, sabores ( nombre )")
      .in("estado", ["cerrado", "abierto", "vacio"])
      .order("id")
      .range(desde, hasta),
  );

  return filas.map((fila) => ({
    codigo: fila.codigo,
    saborNombre: fila.sabores?.nombre ?? "",
    estado: fila.estado,
    kgInicial: Number(fila.kg_inicial),
    kgRestante: Number(fila.kg_restante),
    costo: fila.costo,
    costoEnvase: fila.costo_envase,
  }));
}

export async function armarLibroDeInventario(): Promise<Libro> {
  const [sabores, baldes, insumos, presentaciones, formatos, config] = await Promise.all([
    listarSabores(),
    baldesDelLocal(),
    listarInsumos(),
    listarPresentaciones(),
    listarFormatos(),
    obtenerConfigComercio(),
  ]);

  return libroDeInventario({
    sabores,
    baldes,
    insumos,
    presentaciones,
    formatos,
    stockMinimoDefault: config.stockMinimoDefault,
    precioBaldeDefault: config.precioBaldeDefault,
  });
}
