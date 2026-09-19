"use client";

import { Boton } from "@/componentes/Boton";
import { Campo } from "@/componentes/Campo";
import { useAccionConReset } from "@/lib/useAccionConReset";
import { crearSabor } from "../consultas/acciones";

const INICIAL = { error: null };

export function FormularioSabor() {
  const { estado, accion, enviando, formRef } = useAccionConReset(crearSabor, INICIAL);

  return (
    <form ref={formRef} action={accion} className="flex items-end gap-2">
      <Campo id="nombre-sabor" name="nombre" etiqueta="Sabor nuevo" required />
      <Boton type="submit" disabled={enviando}>
        {enviando ? "Creando…" : "Agregar"}
      </Boton>
      {estado.error && (
        <p role="alert" className="text-sm text-alerta">
          {estado.error}
        </p>
      )}
    </form>
  );
}
