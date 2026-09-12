import Link from "next/link";
import { NOMBRE_COMERCIO } from "@/config/comercio";
import { modulosDe } from "@/config/navegacion";
import { salir } from "@/modulos/auth/consultas/acciones";
import { ETIQUETA_ROL, type Perfil } from "@/modulos/auth/tipos";

export function BarraLateral({ perfil }: { perfil: Perfil }) {
  return (
    <aside className="flex shrink-0 flex-col gap-6 bg-marco p-4 text-superficie md:min-h-dvh md:w-56">
      <div className="font-display text-lg font-bold">{NOMBRE_COMERCIO}</div>

      <nav className="flex flex-1 flex-wrap gap-1 md:flex-col" aria-label="Módulos">
        {modulosDe(perfil.rol).map((modulo) => (
          <Link
            key={modulo.href}
            href={modulo.href}
            className="flex items-center gap-2 rounded-(--r) px-3 py-2 text-sm hover:bg-marco-suave"
          >
            <span aria-hidden="true">{modulo.icono}</span>
            {modulo.etiqueta}
          </Link>
        ))}
      </nav>

      <div className="flex flex-col gap-2 border-t border-marco-suave pt-4">
        <div>
          <div className="text-sm font-semibold">{perfil.nombre}</div>
          <div className="text-xs opacity-70">{ETIQUETA_ROL[perfil.rol]}</div>
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
