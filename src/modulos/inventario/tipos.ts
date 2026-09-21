import type { Balde } from "@/lib/baldes";
import type { Sabor } from "@/lib/sabores";

export type UnidadInsumo = "u" | "kg";

export type Insumo = {
  id: number;
  nombre: string;
  codigo: string;
  unidad: UnidadInsumo;
  cantidad: number;
  minimo: number;
  costo: number;
  activo: boolean;
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
