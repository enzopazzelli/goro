"use client";

import { useActionState, useEffect, useMemo, useRef } from "react";
import { Boton } from "@/componentes/Boton";
import { CampoCodigoONombre } from "@/componentes/CampoCodigoONombre";
import { seleccionarAlEnfocar } from "@/lib/seleccionarAlEnfocar";
import { recibirPorCodigo, type EstadoRecepcion } from "../consultas/accionesRecepcion";
import type { Insumo } from "../tipos";

const INICIAL: EstadoRecepcion = { error: null };
const ROTULO = "flex flex-col gap-1 font-mono text-xs tracking-wide text-texto-suave uppercase";
const CAMPO = "numero rounded-(--r) border border-linea bg-superficie px-3 py-2 text-sm";

/**
 * Recibir un pedido: escanear el código del insumo (o buscarlo por nombre),
 * tipear cuántos llegaron, Enter. La pistola aprieta Enter al terminar de leer,
 * y eso pasa el foco a la cantidad en vez de mandar el formulario incompleto;
 * el segundo Enter lo envía. Al terminar vuelve al código, listo para el
 * artículo siguiente.
 */
export function RecibirPorCodigo({ insumos }: { insumos: Insumo[] }) {
  const [estado, accion, enviando] = useActionState(recibirPorCodigo, INICIAL);
  const formulario = useRef<HTMLFormElement>(null);
  const cantidad = useRef<HTMLInputElement>(null);

  const opciones = useMemo(
    () =>
      insumos
        .filter((insumo) => insumo.activo)
        .map((insumo) => ({
          clave: String(insumo.id),
          codigo: insumo.codigo,
          nombre: insumo.nombre,
          detalle: `hay ${insumo.cantidad} ${insumo.unidad}`,
        })),
    [insumos],
  );

  useEffect(() => {
    if (estado.aviso) {
      // Al vaciarse, el campo del código toma el foco solo.
      formulario.current?.reset();
    }
  }, [estado]);

  return (
    <form ref={formulario} action={accion} className="flex flex-wrap items-end gap-3">
      <CampoCodigoONombre
        opciones={opciones}
        siguiente={cantidad}
        claseRotulo={ROTULO}
        claseCampo={`w-72 ${CAMPO}`}
      />
      <label className={ROTULO}>
        Cuántos llegaron
        <input
          ref={cantidad}
          name="cantidad"
          type="number"
          min="0"
          step="any"
          required
          onFocus={seleccionarAlEnfocar}
          className={`w-32 ${CAMPO}`}
        />
      </label>
      <Boton type="submit" disabled={enviando}>
        {enviando ? "Registrando…" : "Registrar entrada"}
      </Boton>
      <p role="status" className="min-h-5 w-full text-sm text-ok">
        {estado.aviso}
      </p>
      {estado.error && (
        <p role="alert" className="w-full text-sm text-alerta">
          {estado.error}
        </p>
      )}
    </form>
  );
}
