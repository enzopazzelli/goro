"use client";

import { useActionState } from "react";
import { Boton } from "@/componentes/Boton";
import { Campo } from "@/componentes/Campo";
import { ingresar, type EstadoIngreso } from "../consultas/acciones";

const INICIAL: EstadoIngreso = { error: null };

export function FormularioIngreso() {
  const [estado, accion, enviando] = useActionState(ingresar, INICIAL);

  return (
    <form action={accion} className="flex flex-col gap-4">
      <Campo
        id="usuario"
        name="usuario"
        etiqueta="Usuario"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        autoFocus
        required
      />
      <Campo
        id="contrasena"
        name="contrasena"
        type="password"
        etiqueta="Contraseña"
        autoComplete="current-password"
        required
      />

      {estado.error && (
        <p role="alert" className="rounded-(--r) bg-alerta-fondo px-3 py-2 text-sm text-alerta">
          {estado.error}
        </p>
      )}

      <Boton type="submit" disabled={enviando}>
        {enviando ? "Entrando…" : "Entrar"}
      </Boton>
    </form>
  );
}
