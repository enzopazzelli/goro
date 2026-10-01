export type MedioPago = "efectivo" | "tarjeta" | "transferencia";
export type EstadoVenta = "cobrada" | "anulada";

export const ETIQUETA_MEDIO_PAGO: Record<MedioPago, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
};

/** Lo mínimo que necesita el servidor para registrar un item. */
export type ItemDeTicket =
  | { tipo: "formato"; formatoId: number; saborIds: number[] }
  | { tipo: "producto"; presentacionId: number };

/** Lo que necesita la pantalla para mostrar el ticket en construcción. */
export type ItemEnCarrito = ItemDeTicket & {
  nombre: string;
  precio: number;
  saboresNombres: string[];
};

export type SaborDeItem = {
  saborId: number;
  saborNombre: string;
};

export type ItemVentaReciente = {
  id: number;
  nombre: string;
  precio: number;
  sabores: SaborDeItem[];
};

export type VentaReciente = {
  id: number;
  medioPago: MedioPago;
  total: number;
  estado: EstadoVenta;
  creadoEn: string;
  items: ItemVentaReciente[];
};

/**
 * El aviso que queda después de cobrar. El total es el que registró la base,
 * no el que sumaba la pantalla, y el número es el de la venta en Últimas
 * ventas: con eso se abre el ticket completo, se corrige un sabor o se anula.
 */
export type Cobrado = {
  ventaId: number;
  /** `null` si la venta entró pero no se pudo volver a leer su total. */
  total: number | null;
  medioPago: MedioPago;
};
