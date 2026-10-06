export type TipoDescarte = "balde" | "pote" | "insumo";
export type MotivoDescarte = "resto_de_balde" | "vencido" | "roto" | "derretido" | "otro";
export type Unidad = "u" | "kg";

/**
 * Los que elige una persona. "Resto de balde" no está: lo pone solo "Se
 * terminó", y la base lo rechaza en cualquier otra cosa.
 */
export const MOTIVOS_A_ELEGIR = ["vencido", "roto", "derretido", "otro"] as const;
export type MotivoAElegir = (typeof MOTIVOS_A_ELEGIR)[number];

export function esMotivoAElegir(valor: unknown): valor is MotivoAElegir {
  return (MOTIVOS_A_ELEGIR as readonly unknown[]).includes(valor);
}

export const ETIQUETA_MOTIVO: Record<MotivoDescarte, string> = {
  resto_de_balde: "Resto de balde",
  vencido: "Vencido",
  roto: "Se rompió o se cayó",
  derretido: "Se derritió",
  otro: "Otro",
};

/** Una cosa tirada, como la lee la pantalla. */
export type Descarte = {
  id: number;
  tipo: TipoDescarte;
  /** El sabor (de un balde o de un pote) o el nombre del artículo. */
  que: string;
  /** Con qué se suma en "lo que más se tira": el sabor, o el artículo en su unidad. */
  grupo: string;
  cantidad: number;
  unidad: Unidad;
  motivo: MotivoDescarte;
  nota: string | null;
  costo: number;
  creadoPor: string;
  creadoEn: string;
};

/** Un renglón de "lo que más se tira". */
export type RenglonDeDescarte = {
  grupo: string;
  que: string;
  unidad: Unidad;
  cantidad: number;
  costo: number;
  veces: number;
};

export type MotivoDelPeriodo = { motivo: MotivoDescarte; veces: number; costo: number };

export type ResumenDeDescarte = {
  total: number;
  ranking: RenglonDeDescarte[];
  porMotivo: MotivoDelPeriodo[];
};

/** Un artículo que se puede descartar desde la pantalla: insumo, producto o envase. */
export type ArticuloDescartable = {
  id: number;
  nombre: string;
  unidad: Unidad;
  tipo: "insumo" | "producto" | "envase";
  cantidad: number;
};
