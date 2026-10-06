"use client";

import { SiPuede } from "@/modulos/auth/componentes/Permisos";
import { useState } from "react";
import { Boton } from "@/componentes/Boton";
import { BotonDesplegar } from "./BotonDesplegar";
import type { Insumo } from "../tipos";
import { FormularioEdicionInsumo } from "./FormularioEdicionInsumo";
import { InsigniaStock } from "./InsigniaStock";
import { ModalCargarInsumo } from "./ModalCargarInsumo";

const ETIQUETA_UNIDAD: Record<string, string> = { u: "u", kg: "kg" };

export function FilaInsumoExpandible({ insumo, esDuenio }: { insumo: Insumo; esDuenio: boolean }) {
  const [expandida, setExpandida] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);

  return (
    <>
      <tr className="border-b border-linea last:border-0">
        <td className="px-2 py-[var(--fila-y)] font-semibold">{insumo.nombre}</td>
        <td className="numero px-2 py-[var(--fila-y)] text-texto-suave">{insumo.codigo}</td>
        <td className="numero px-2 py-[var(--fila-y)]">
          {insumo.cantidad} {ETIQUETA_UNIDAD[insumo.unidad]}
        </td>
        <td className="px-2 py-[var(--fila-y)]">
          <InsigniaStock cantidad={insumo.cantidad} minimo={insumo.minimo} />
        </td>
        <td className="px-2 py-[var(--fila-y)]">
          <SiPuede permiso="cargar_inventario">
            <Boton
              type="button"
              variante="suave"
              tamano="chico"
              onClick={() => setModalAbierto(true)}
            >
              Cargar
            </Boton>
          </SiPuede>
        </td>
        <td className="px-2 py-[var(--fila-y)]">
          {esDuenio && (
            <BotonDesplegar
              expandida={expandida}
              onAlternar={() => setExpandida((actual) => !actual)}
            />
          )}
        </td>
      </tr>

      {expandida && esDuenio && (
        <tr className="border-b border-linea bg-superficie-honda last:border-0">
          <td colSpan={6} className="p-2">
            <FormularioEdicionInsumo insumo={insumo} />
          </td>
        </tr>
      )}

      <ModalCargarInsumo
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        insumoId={insumo.id}
        insumoNombre={insumo.nombre}
      />
    </>
  );
}
