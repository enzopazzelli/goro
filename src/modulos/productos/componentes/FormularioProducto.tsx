"use client";

import { Boton } from "@/componentes/Boton";
import { Campo } from "@/componentes/Campo";
import { useAccionConReset } from "@/lib/useAccionConReset";
import { crearProducto } from "../consultas/acciones";

const INICIAL = { error: null };

export function FormularioProducto() {
  const { estado, accion, enviando, formRef } = useAccionConReset(crearProducto, INICIAL);

  return (
    <form ref={formRef} action={accion} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <Campo
          id="nombre-producto"
          name="nombre"
          etiqueta="Producto"
          placeholder="Bombón"
          required
        />
        <Campo
          id="costo-producto"
          name="costo"
          etiqueta="Costo por unidad (lo que pagás)"
          type="number"
          min="0"
          required
        />
        <Campo
          id="stock-producto"
          name="cantidadInicial"
          etiqueta="Stock inicial"
          type="number"
          min="0"
        />
        <Boton type="submit" disabled={enviando}>
          {enviando ? "Creando…" : "Agregar"}
        </Boton>
      </div>
      <p className="text-xs text-texto-suave">
        Se crea con las presentaciones Unidad ×1 y Docena ×12. El precio de venta se pone después,
        desde la pestaña Productos.
      </p>
      {estado.error && (
        <p role="alert" className="text-sm text-alerta">
          {estado.error}
        </p>
      )}
    </form>
  );
}
