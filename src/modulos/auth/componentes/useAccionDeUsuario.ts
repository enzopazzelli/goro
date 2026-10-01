"use client";

import { useActionState } from "react";
import type { EstadoUsuario } from "../consultas/administracion";

const INICIAL: EstadoUsuario = { error: null };

/**
 * Las acciones de Usuarios terminan todas igual: si salió bien, se cierra el
 * modal y se muestra el aviso ("se borró", "quedó desactivado"). Se avisa al
 * terminar la acción, nunca comparando estados durante el render (ver
 * ModalCargarInsumo).
 */
export function useAccionDeUsuario(
  accion: (previo: EstadoUsuario, datos: FormData) => Promise<EstadoUsuario>,
  alTerminar: (aviso?: string) => void,
) {
  return useActionState(async (previo: EstadoUsuario, datos: FormData) => {
    const resultado = await accion(previo, datos);
    if (!resultado.error) alTerminar(resultado.aviso);
    return resultado;
  }, INICIAL);
}
