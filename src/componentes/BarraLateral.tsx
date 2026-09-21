"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NOMBRE_COMERCIO } from "@/config/comercio";
import { modulosDe } from "@/config/navegacion";
import { salir } from "@/modulos/auth/consultas/acciones";
import { ETIQUETA_ROL, type Perfil } from "@/modulos/auth/tipos";

export function BarraLateral({ perfil }: { perfil: Perfil }) {
  const ruta = usePathname();

  return (
    <aside className="flex shrink-0 flex-col gap-4 bg-marco p-4 text-fondo md:min-h-dvh md:w-56">
      <div className="rounded-(--radius-arco) bg-acento px-4 pt-4 pb-3 text-center">
        <div className="font-display text-lg font-bold text-acento-texto">{NOMBRE_COMERCIO}</div>
        <div className="font-mono text-xs tracking-[0.16em] text-acento-texto/80 uppercase">
          Heladería artesanal
        </div>
      </div>

      <nav className="flex flex-1 flex-wrap gap-1 md:flex-col" aria-label="Módulos">
        {modulosDe(perfil.rol).map((modulo) => {
          const activo = ruta === modulo.href;
          return (
            <Link
              key={modulo.href}
              href={modulo.href}
              aria-current={activo ? "page" : undefined}
              className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm transition ${
                activo
                  ? "bg-fondo font-semibold text-marco"
                  : "text-fondo/85 hover:bg-marco-suave hover:text-fondo"
              }`}
            >
              <span aria-hidden="true">{modulo.icono}</span>
              {modulo.etiqueta}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-2 border-t border-marco-suave pt-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destacado font-display font-bold text-marco">
            {perfil.nombre.charAt(0).toUpperCase()}
          </span>
          <div>
            <div className="text-sm font-semibold">{perfil.nombre}</div>
            <div className="font-mono text-xs text-fondo/60">{ETIQUETA_ROL[perfil.rol]}</div>
          </div>
        </div>
        <form action={salir}>
          <button type="submit" className="text-xs underline opacity-70 hover:opacity-100">
            Salir
          </button>
        </form>
      </div>
    </aside>
  );
}
