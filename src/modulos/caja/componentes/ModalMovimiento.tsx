"use client";

import { useActionState } from "react";
import { Boton } from "@/componentes/Boton";
import { Campo } from "@/componentes/Campo";
import { Modal } from "@/componentes/Modal";
import { registrarMovimientoCaja, type EstadoFormulario } from "../consultas/acciones";
import type { TipoManual } from "../tipos";

const INICIAL: EstadoFormulario = { error: null };

const TEXTOS: Record<TipoManual, { titulo: string; ejemplo: string }> = {
  ingreso: { titulo: "Registrar un ingreso", ejemplo: "Cambio que trajo Goro…" },
  gasto: { titulo: "Registrar un gasto", ejemplo: "Hielo seco, delivery, proveedor…" },
  retiro: { titulo: "Registrar un retiro", ejemplo: "Se lo llevó Goro…" },
};

export function ModalMovimiento({ tipo, onCerrar }: { tipo: TipoManual; onCerrar: () => void }) {
  // Se cierra al terminar la acción, nunca durante el render (ver ModalCargarInsumo).
  const [estado, accion, enviando] = useActionState(
    async (previo: EstadoFormulario, datos: FormData) => {
      const resultado = await registrarMovimientoCaja(previo, datos);
      if (!resultado.error) onCerrar();
      return resultado;
    },
    INICIAL,
  );

  return (
    <Modal abierto onCerrar={onCerrar} titulo={TEXTOS[tipo].titulo} cerrarConClicAfuera={false}>
      <form action={accion} className="flex flex-col gap-3">
        <input type="hidden" name="tipo" value={tipo} />
        <Campo
          etiqueta="Detalle"
          name="detalle"
          type="text"
          placeholder={TEXTOS[tipo].ejemplo}
          required
        />
        <Campo
          etiqueta="Monto"
          name="monto"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          required
        />
        {estado.error && (
          <p role="alert" className="text-sm text-alerta">
            {estado.error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Boton type="button" variante="fantasma" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" disabled={enviando}>
            {enviando ? "Guardando…" : "Registrar"}
          </Boton>
        </div>
      </form>
    </Modal>
  );
}
