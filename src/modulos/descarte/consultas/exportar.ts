import "server-only";
import type { Libro } from "@/lib/excel/libro";
import { nombresDePerfiles } from "@/lib/nombresDePerfiles";
import type { Periodo } from "@/lib/periodos";
import { libroDeDescarte } from "../libroDeDescarte";
import { descartesDelPeriodo } from "./descartes";

export async function armarLibroDeDescarte(periodo: Periodo): Promise<Libro> {
  const [descartes, nombres] = await Promise.all([
    descartesDelPeriodo(periodo),
    nombresDePerfiles(),
  ]);
  return libroDeDescarte(descartes, nombres);
}
