"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Boton } from "@/componentes/Boton";
import { CampoCodigoONombre } from "@/componentes/CampoCodigoONombre";
import { nuevaClave } from "@/lib/claveUnica";
import { seleccionarAlEnfocar } from "@/lib/seleccionarAlEnfocar";
import { descartarArticulo, type EstadoDescarte } from "../consultas/acciones";
import { LARGO_MAXIMO_DE_NOTA } from "../formulario";
import { ETIQUETA_MOTIVO, MOTIVOS_A_ELEGIR, type ArticuloDescartable } from "../tipos";

const INICIAL: EstadoDescarte = { error: null };
const ROTULO = "flex flex-col gap-1 font-mono text-xs tracking-wide text-texto-suave uppercase";
const CAMPO = "rounded-(--r) border border-linea bg-superficie px-3 py-2 text-sm normal-case";

/**
 * Se escanea (o se busca por nombre) lo que se tira, la cantidad y el motivo.
 * Como en Recibir por código, el Enter de la pistola pasa a la cantidad en vez
 * de mandar el formulario a medias; al terminar vuelve al código.
 */
export function FormularioDescarte({ articulos }: { articulos: ArticuloDescartable[] }) {
  const formulario = useRef<HTMLFormElement>(null);
  const cantidad = useRef<HTMLInputElement>(null);
  // Identifica este descarte ante la base: si se manda dos veces sin cambiar
  // nada (doble clic, respuesta perdida), la base devuelve el mismo y el stock
  // baja una sola vez. Cambia con cualquier cambio del formulario. Se genera en
  // un evento y no al renderizar: el servidor y el navegador no coincidirían.
  const [clave, setClave] = useState("");

  async function descartar(previo: EstadoDescarte, datos: FormData): Promise<EstadoDescarte> {
    const resultado = await descartarArticulo(previo, datos);
    if (!resultado.error) setClave("");
    return resultado;
  }
  const [estado, accion, enviando] = useActionState(descartar, INICIAL);

  useEffect(() => {
    if (estado.aviso) {
      // Al vaciarse, el campo del código toma el foco solo.
      formulario.current?.reset();
    }
  }, [estado]);

  const opciones = useMemo(
    () =>
      articulos.map((articulo) => ({
        clave: String(articulo.id),
        codigo: articulo.codigo,
        nombre: articulo.nombre,
        detalle: `hay ${articulo.cantidad} ${articulo.unidad}`,
      })),
    [articulos],
  );

  return (
    <form
      ref={formulario}
      action={accion}
      onChange={() => setClave(nuevaClave())}
      className="flex flex-wrap items-end gap-3"
    >
      <input type="hidden" name="clave" value={clave} />
      <CampoCodigoONombre
        opciones={opciones}
        siguiente={cantidad}
        claseRotulo={ROTULO}
        claseCampo={`w-72 ${CAMPO}`}
      />
      <label className={ROTULO}>
        Cantidad
        <input
          ref={cantidad}
          name="cantidad"
          type="number"
          min="0"
          step="any"
          required
          onFocus={seleccionarAlEnfocar}
          className={`numero w-28 ${CAMPO}`}
        />
      </label>
      <label className={ROTULO}>
        Por qué
        <select name="motivo" defaultValue="vencido" className={CAMPO}>
          {MOTIVOS_A_ELEGIR.map((motivo) => (
            <option key={motivo} value={motivo}>
              {ETIQUETA_MOTIVO[motivo]}
            </option>
          ))}
        </select>
      </label>
      <label className={ROTULO}>
        Nota (opcional)
        <input name="nota" maxLength={LARGO_MAXIMO_DE_NOTA} className={`w-56 ${CAMPO}`} />
      </label>
      <Boton type="submit" variante="peligro" disabled={enviando}>
        {enviando ? "Descartando…" : "Descartar"}
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
