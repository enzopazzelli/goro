import type { Balde } from "@/lib/baldes";
import type { Sabor } from "@/lib/sabores";

export type UnidadInsumo = "u" | "kg";
export type TipoInsumo = "insumo" | "producto" | "envase";

export type Insumo = {
  id: number;
  nombre: string;
  codigo: string;
  unidad: UnidadInsumo;
  cantidad: number;
  minimo: number;
  costo: number;
  activo: boolean;
  /** insumo = se consume; producto = se vende por unidad; envase = el stock propio de un formato. */
  tipo: TipoInsumo;
  /** Solo para los envases: el formato al que pertenecen. */
  formatoId: number | null;
};

export type TipoMovimientoInsumo = "entrada" | "ajuste";

export type InsigniaSabor = { variante: "ok" | "advertencia" | "alerta"; texto: string };

export type FilaSaborVista = {
  sabor: Sabor;
  baldes: Balde[];
  pct: number;
  insignia: InsigniaSabor;
  baldeAbiertoId: number | null;
};
