export type MedioPago = "efectivo" | "tarjeta" | "transferencia";
export type EstadoVenta = "cobrada" | "anulada";

/** Lo mínimo que necesita el servidor para registrar un item. */
export type ItemDeTicket = {
  formatoId: number;
  saborIds: number[];
};

/** Lo que necesita la pantalla para mostrar el ticket en construcción. */
export type ItemEnCarrito = ItemDeTicket & {
  formatoNombre: string;
  precio: number;
  saboresNombres: string[];
};

export type SaborDeItem = {
  saborId: number;
  saborNombre: string;
};

export type ItemVentaReciente = {
  id: number;
  formatoNombre: string;
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
