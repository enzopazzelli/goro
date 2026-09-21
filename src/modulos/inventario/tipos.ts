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
