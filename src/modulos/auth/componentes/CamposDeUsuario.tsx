"use client";

import { useState } from "react";
import { Campo } from "@/componentes/Campo";
import { LARGO_MINIMO_CONTRASENA } from "../alta";
import { ETIQUETA_ROL, type Rol } from "../tipos";
import { normalizarUsuario } from "../usuario";

const ROTULO = "font-mono text-xs font-semibold tracking-wide text-texto-suave uppercase";

/** El usuario se normaliza al guardar ("Ana Ruiz" → "ana.ruiz"): se muestra antes cómo va a quedar. */
export function CampoUsuario({ inicial = "" }: { inicial?: string }) {
  const [valor, setValor] = useState(inicial);
  const normalizado = normalizarUsuario(valor);

  return (
    <div className="flex flex-col gap-1">
      <Campo
        etiqueta="Usuario"
        name="usuario"
        value={valor}
        onChange={(evento) => setValor(evento.target.value)}
        autoCapitalize="none"
        autoComplete="off"
        spellCheck={false}
        required
      />
      {normalizado && normalizado !== valor && (
        <p className="text-xs text-texto-suave">
          Va a entrar como <strong className="numero">{normalizado}</strong>
        </p>
      )}
    </div>
  );
}

/**
 * Con "Mostrar": la contraseña la tipea el dueño para otra persona y después se
 * la tiene que decir. Un typo que no se ve deja a esa persona sin poder entrar.
 */
export function CampoContrasena({ etiqueta = "Contraseña" }: { etiqueta?: string }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      <Campo
        etiqueta={etiqueta}
        name="contrasena"
        type={visible ? "text" : "password"}
        autoComplete="new-password"
        minLength={LARGO_MINIMO_CONTRASENA}
        required
      />
      <label className="flex items-center gap-2 text-xs text-texto-suave">
        <input
          type="checkbox"
          checked={visible}
          onChange={(evento) => setVisible(evento.target.checked)}
        />
        Mostrar · mínimo {LARGO_MINIMO_CONTRASENA} caracteres
      </label>
    </div>
  );
}

export function SelectorRol({
  inicial,
  fijo = false,
  onCambiar,
}: {
  inicial: Rol;
  fijo?: boolean;
  onCambiar?: (rol: Rol) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className={ROTULO}>Rol</span>
      <select
        name="rol"
        defaultValue={inicial}
        disabled={fijo}
        onChange={(evento) => onCambiar?.(evento.target.value as Rol)}
        className="rounded-(--r) border border-linea bg-superficie px-3 py-2 disabled:opacity-55"
      >
        {(Object.keys(ETIQUETA_ROL) as Rol[]).map((rol) => (
          <option key={rol} value={rol}>
            {ETIQUETA_ROL[rol]}
          </option>
        ))}
      </select>
      {fijo && (
        <>
          {/* Un select deshabilitado no viaja en el formulario. */}
          <input type="hidden" name="rol" value={inicial} />
          <span className="text-xs text-texto-suave">Tu propio rol no se puede cambiar.</span>
        </>
      )}
    </label>
  );
}
