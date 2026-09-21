"use client";

import { Boton } from "@/componentes/Boton";
import { Campo } from "@/componentes/Campo";
import { useAccionConReset } from "@/lib/useAccionConReset";
import { crearFormato } from "../consultas/accionesFormatos";

const INICIAL = { error: null };

export function FormularioFormato() {
  const { estado, accion, enviando, formRef } = useAccionConReset(crearFormato, INICIAL);

  return (
    <form ref={formRef} action={accion} className="flex flex-wrap items-end gap-2">
      <Campo id="nombre-formato" name="nombre" etiqueta="Formato nuevo" required />
      <Campo id="gramos-formato" name="gramos" etiqueta="Gramos" type="number" min="1" required />
      <Campo
        id="cantidad-sabores-formato"
        name="cantidadSabores"
        etiqueta="Cant. sabores"
        type="number"
        min="1"
        required
      />
      <Campo id="precio-formato" name="precio" etiqueta="Precio" type="number" min="0" required />
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
