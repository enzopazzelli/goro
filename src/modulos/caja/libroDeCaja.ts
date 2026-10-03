import { entero, fechaYHora, plata, siNo, texto } from "@/lib/excel/celdas";
import type { Libro } from "@/lib/excel/libro";
import { ETIQUETA_TIPO, type Arqueo, type MovimientoCaja } from "./tipos";

export type TurnoParaExcel = {
  id: number;
  abiertoPor: string;
  abiertoEn: string;
  cerradoPor: string | null;
  cerradoEn: string | null;
};

export type DatosDeCaja = {
  turnos: TurnoParaExcel[];
  movimientos: (MovimientoCaja & { turnoId: number })[];
  arqueos: (Arqueo & { turnoId: number })[];
};

/**
 * Dos hojas: "Turnos" con el arqueo de cada uno (lo esperado contra lo contado)
 * y "Movimientos" con cada peso que entró o salió del cajón. El número de turno
 * es el hilo entre las dos.
 *
 * El arqueo solo lo lee el dueño (RLS), y este archivo también es del dueño:
 * por eso puede mostrar el esperado y la diferencia sin romper el arqueo ciego,
 * que protege a quien CUENTA, no a quien lo revisa después.
 */
export function libroDeCaja(datos: DatosDeCaja, nombres: Map<string, string>): Libro {
  const quien = (id: string | null) => (id ? (nombres.get(id) ?? "") : "");
  const arqueoDe = (turnoId: number) => datos.arqueos.find((a) => a.turnoId === turnoId);
  const aperturaDe = (turnoId: number) =>
    datos.movimientos.find((m) => m.turnoId === turnoId && m.tipo === "apertura")?.monto;

  return {
    nombre: "caja",
    hojas: [
      {
        nombre: "Turnos",
        columnas: [
          { titulo: "N° de turno", ancho: 13 },
          { titulo: "Abrió", ancho: 20 },
          { titulo: "Abierto el", ancho: 18 },
          { titulo: "Cerró", ancho: 20 },
          { titulo: "Cerrado el", ancho: 18 },
          { titulo: "Fondo al abrir", ancho: 16 },
          { titulo: "Esperado", ancho: 13 },
          { titulo: "Contado", ancho: 13 },
          { titulo: "Diferencia", ancho: 13 },
          { titulo: "Quedó de fondo", ancho: 16 },
        ],
        filas: datos.turnos.map((turno) => {
          const arqueo = arqueoDe(turno.id);
          return [
            entero(turno.id),
            texto(quien(turno.abiertoPor)),
            fechaYHora(turno.abiertoEn),
            texto(quien(turno.cerradoPor)),
            fechaYHora(turno.cerradoEn),
            plata(aperturaDe(turno.id)),
            plata(arqueo?.esperado),
            plata(arqueo?.contado),
            plata(arqueo?.diferencia),
            plata(arqueo?.fondoQueQueda),
          ];
        }),
      },
      {
        nombre: "Movimientos",
        columnas: [
          { titulo: "N° de turno", ancho: 13 },
          { titulo: "Fecha y hora", ancho: 18 },
          { titulo: "Movimiento", ancho: 14 },
          { titulo: "Detalle", ancho: 36 },
          { titulo: "Monto", ancho: 13 },
          { titulo: "Anulado", ancho: 10 },
          { titulo: "N° de venta", ancho: 13 },
          { titulo: "Registró", ancho: 20 },
        ],
        filas: datos.movimientos.map((movimiento) => [
          entero(movimiento.turnoId),
          fechaYHora(movimiento.creadoEn),
          texto(ETIQUETA_TIPO[movimiento.tipo]),
          texto(movimiento.detalle),
          plata(movimiento.monto),
          siNo(movimiento.anulado),
          entero(movimiento.ventaId),
          texto(quien(movimiento.creadoPor)),
        ]),
      },
    ],
  };
}
