/** Un pote armado que sigue en el freezer, listo para vender. */
export type PoteEnFreezer = {
  id: number;
  codigo: string;
  formatoNombre: string;
  saborNombre: string;
  /** El peso que marcó la balanza al armarlo, en gramos. */
  pesoG: number;
  /** Congelado al armar: lo que dice la etiqueta, aunque después cambie la lista de precios. */
  precio: number;
  armadoEn: string;
};

/** Un balde abierto, del que se puede sacar helado para armar un pote. */
export type BaldeParaArmar = {
  id: number;
  saborNombre: string;
  kgRestante: number;
};
