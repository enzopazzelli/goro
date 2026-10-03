"use client";

import { SiPuede } from "@/modulos/auth/componentes/Permisos";
import { useState } from "react";
import { etiquetaPresentacion, textoPrecio } from "@/lib/etiquetaPresentacion";
import type { Presentacion } from "@/lib/presentaciones";
import { BotonLlevaEnvase } from "@/modulos/productos/componentes/BotonLlevaEnvase";
import { PresentacionesInsumo } from "@/modulos/productos/componentes/PresentacionesInsumo";
import type { Insumo } from "../tipos";
import { FormularioEdicionInsumo } from "./FormularioEdicionInsumo";
import { formatearPlata } from "@/lib/plata";
import { InsigniaStock } from "./InsigniaStock";
import { ModalCargarInsumo } from "./ModalCargarInsumo";

/**
 * El envase propio de un formato (su cono, canasta o vasito): cuántos hay, lo
 * que cuesta cada uno y a cuánto se vende suelto ("sin helado"). Se descuenta
 * solo al vender el formato con helado. Un formato sin envase (el pote) no
 * muestra nada a quien no es dueño.
 */
export function EnvaseFormato({
  formatoId,
  envase,
  presentaciones,
  esDuenio,
}: {
  formatoId: number;
  envase: Insumo | null;
  presentaciones: Presentacion[];
  esDuenio: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);

  if (!envase) return esDuenio ? <BotonLlevaEnvase formatoId={formatoId} /> : null;

  return (
    <div className="ml-2 flex flex-col gap-2 rounded-(--r) border border-linea bg-superficie-honda p-2 text-xs">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-semibold">Envase para vender sin helado</span>
        <span className="numero">{envase.cantidad} en stock</span>
        <InsigniaStock cantidad={envase.cantidad} minimo={envase.minimo} />
        <span className="text-texto-suave">
          Costo por unidad <span className="numero">{formatearPlata(envase.costo)}</span>
        </span>
        {presentaciones.map((presentacion) => (
          <span key={presentacion.id} className="whitespace-nowrap">
            {etiquetaPresentacion(presentacion.nombre, presentacion.unidades)}{" "}
            <span className="numero font-semibold">{textoPrecio(presentacion)}</span>
          </span>
        ))}
        <SiPuede permiso="cargar_inventario">
          <button
            type="button"
            onClick={() => setModalAbierto(true)}
            className="underline opacity-70"
          >
            Cargar
          </button>
        </SiPuede>
        {esDuenio && (
          <button
            type="button"
            onClick={() => setEditando((actual) => !actual)}
            aria-expanded={editando}
            className="underline opacity-70"
          >
            {editando ? "Cerrar" : "Editar"}
          </button>
        )}
      </div>

      {editando && esDuenio && (
        <div className="flex flex-col gap-3">
          <FormularioEdicionInsumo insumo={envase} conUnidad={false} />
          <PresentacionesInsumo insumoId={envase.id} presentaciones={presentaciones} />
        </div>
      )}

      <ModalCargarInsumo
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        insumoId={envase.id}
        insumoNombre={envase.nombre}
      />
    </div>
  );
}
