export type Sabor = {
  id: number;
  nombre: string;
  activo: boolean;
  stockMinimo: number | null;
};

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

export type EstadoBalde = "cerrado" | "abierto" | "vendido" | "vacio" | "canjeado";

export type Balde = {
  id: number;
  codigo: string;
  saborId: number;
  kgInicial: number;
  kgRestante: number;
  estado: EstadoBalde;
  costo: number;
  costoEnvase: number;
};
