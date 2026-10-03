import type { Cell } from "write-excel-file/node";
import { relojDelLocal } from "@/lib/fechas";
import { sanearTexto } from "./saneo";

/*
 * Una función por tipo de dato que va a una celda. Existen para que ningún
 * export escriba un valor "a mano": el texto de una persona siempre pasa por el
 * saneo, y la plata y los kilos siempre salen con el mismo formato.
 */

/** Texto cargado por una persona o de la base. Vacío queda como celda vacía. */
export function texto(valor: string | null | undefined): Cell {
  return valor ? { value: sanearTexto(valor), type: String } : null;
}

export function entero(valor: number | null | undefined): Cell {
  return valor === null || valor === undefined ? null : { value: valor, type: Number };
}

/** Pesos enteros: la plata del local no tiene centavos. */
export function plata(valor: number | null | undefined): Cell {
  if (valor === null || valor === undefined) return null;
  return { value: valor, type: Number, format: "$#,##0" };
}

export function kilos(valor: number | null | undefined): Cell {
  if (valor === null || valor === undefined) return null;
  return { value: valor, type: Number, format: "#,##0.00" };
}

/** "Sí" / "No": una casilla verdadero/falso se lee peor que la palabra. */
export function siNo(valor: boolean): Cell {
  return { value: valor ? "Sí" : "No", type: String };
}

/** Un instante, con la hora que marcaba el reloj del local. */
export function fechaYHora(iso: string | null | undefined): Cell {
  if (!iso) return null;
  return { value: relojDelLocal(iso), type: Date, format: "dd/mm/yyyy hh:mm" };
}

export function titulo(valor: string): Cell {
  return { value: valor, type: String, fontWeight: "bold" };
}
