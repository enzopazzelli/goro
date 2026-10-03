import { entero, kilos, plata, siNo, texto } from "@/lib/excel/celdas";
import type { Hoja, Libro } from "@/lib/excel/libro";
import type { Formato } from "@/lib/formatos";
import type { Presentacion } from "@/lib/presentaciones";
import type { Sabor } from "@/lib/sabores";
import type { Insumo } from "./tipos";

/** Un balde que sigue en el local: en la cámara, en el mostrador, o terminado y esperando el canje. */
export type BaldeDelLocal = {
  codigo: string;
  saborNombre: string;
  estado: "cerrado" | "abierto" | "vacio";
  kgInicial: number;
  kgRestante: number;
  costo: number;
  costoEnvase: number;
};

export type DatosDeInventario = {
  sabores: Sabor[];
  baldes: BaldeDelLocal[];
  insumos: Insumo[];
  presentaciones: Presentacion[];
  formatos: Formato[];
  stockMinimoDefault: number;
  precioBaldeDefault: number | null;
};

const ETIQUETA_ESTADO = { cerrado: "Cerrado", abierto: "Abierto", vacio: "Vacío (por canjear)" };
const ETIQUETA_UNIDAD = { u: "unidades", kg: "kilos" };

function hojaDeSabores(datos: DatosDeInventario): Hoja {
  const enStock = (saborNombre: string) =>
    datos.baldes.filter((b) => b.saborNombre === saborNombre && b.estado !== "vacio");

  return {
    nombre: "Sabores",
    columnas: [
      { titulo: "Sabor", ancho: 28 },
      { titulo: "Activo", ancho: 9 },
      { titulo: "Kilos en stock", ancho: 15 },
      { titulo: "Baldes cerrados", ancho: 16 },
      { titulo: "Mínimo de alerta (kg)", ancho: 22 },
      { titulo: "Precio del balde entero", ancho: 24 },
    ],
    filas: datos.sabores.map((sabor) => {
      const baldes = enStock(sabor.nombre);
      return [
        texto(sabor.nombre),
        siNo(sabor.activo),
        kilos(baldes.reduce((suma, b) => suma + b.kgRestante, 0)),
        entero(baldes.filter((b) => b.estado === "cerrado").length),
        // Sin uno propio vale el del comercio: es el número que de verdad dispara la alerta.
        kilos(sabor.stockMinimo ?? datos.stockMinimoDefault),
        plata(sabor.precioBalde ?? datos.precioBaldeDefault),
      ];
    }),
  };
}

function hojaDeBaldes(datos: DatosDeInventario): Hoja {
  return {
    nombre: "Baldes",
    columnas: [
      { titulo: "Código", ancho: 14 },
      { titulo: "Sabor", ancho: 28 },
      { titulo: "Estado", ancho: 22 },
      { titulo: "Kilos al entrar", ancho: 16 },
      { titulo: "Kilos restantes", ancho: 16 },
      { titulo: "Costo", ancho: 12 },
      { titulo: "Costo del envase", ancho: 18 },
    ],
    filas: datos.baldes.map((balde) => [
      texto(balde.codigo),
      texto(balde.saborNombre),
      texto(ETIQUETA_ESTADO[balde.estado]),
      kilos(balde.kgInicial),
      kilos(balde.kgRestante),
      plata(balde.costo),
      plata(balde.costoEnvase),
    ]),
  };
}

function hojaDeInsumos(datos: DatosDeInventario): Hoja {
  return {
    nombre: "Insumos",
    columnas: [
      { titulo: "Insumo", ancho: 30 },
      { titulo: "Código", ancho: 14 },
      { titulo: "Unidad", ancho: 11 },
      { titulo: "Stock", ancho: 10 },
      { titulo: "Mínimo", ancho: 10 },
      { titulo: "Costo por unidad", ancho: 18 },
      { titulo: "Activo", ancho: 9 },
    ],
    filas: datos.insumos
      .filter((insumo) => insumo.tipo === "insumo")
      .map((insumo) => [
        texto(insumo.nombre),
        texto(insumo.codigo),
        texto(ETIQUETA_UNIDAD[insumo.unidad]),
        kilos(insumo.cantidad),
        kilos(insumo.minimo),
        plata(insumo.costo),
        siNo(insumo.activo),
      ]),
  };
}

/** Una fila por presentación: el stock y el costo se repiten en cada una, para poder filtrar sin armar nada. */
function hojaDeProductos(datos: DatosDeInventario): Hoja {
  const filas = datos.insumos
    .filter((insumo) => insumo.tipo !== "insumo")
    .flatMap((articulo) =>
      datos.presentaciones
        .filter((presentacion) => presentacion.insumoId === articulo.id)
        .map((presentacion) => [
          texto(articulo.nombre),
          texto(articulo.tipo === "envase" ? "Envase (sin helado)" : "Producto"),
          entero(articulo.cantidad),
          plata(articulo.costo),
          texto(presentacion.nombre),
          entero(presentacion.unidades),
          plata(presentacion.precio),
          siNo(presentacion.activo),
        ]),
    );

  return {
    nombre: "Productos y envases",
    columnas: [
      { titulo: "Artículo", ancho: 30 },
      { titulo: "Tipo", ancho: 20 },
      { titulo: "Stock (u)", ancho: 11 },
      { titulo: "Costo por unidad", ancho: 18 },
      { titulo: "Presentación", ancho: 18 },
      { titulo: "Unidades", ancho: 11 },
      { titulo: "Precio", ancho: 12 },
      { titulo: "A la venta", ancho: 12 },
    ],
    filas,
  };
}

function hojaDeFormatos(datos: DatosDeInventario): Hoja {
  return {
    nombre: "Formatos",
    columnas: [
      { titulo: "Formato", ancho: 28 },
      { titulo: "Gramos", ancho: 10 },
      { titulo: "Sabores", ancho: 10 },
      { titulo: "Precio", ancho: 12 },
      { titulo: "Activo", ancho: 9 },
    ],
    filas: datos.formatos.map((formato) => [
      texto(formato.nombre),
      entero(formato.gramos),
      entero(formato.cantidadSabores),
      plata(formato.precio),
      siNo(formato.activo),
    ]),
  };
}

/** Lo que hay hoy en el local, en cinco hojas: se abre en Excel sin pedirle nada a nadie. */
export function libroDeInventario(datos: DatosDeInventario): Libro {
  return {
    nombre: "inventario",
    hojas: [
      hojaDeSabores(datos),
      hojaDeBaldes(datos),
      hojaDeInsumos(datos),
      hojaDeProductos(datos),
      hojaDeFormatos(datos),
    ],
  };
}
