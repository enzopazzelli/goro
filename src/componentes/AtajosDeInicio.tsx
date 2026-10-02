import Link from "next/link";
import { Tarjeta } from "@/componentes/Tarjeta";

const ATAJOS = [
  { href: "/ventas", etiqueta: "Cobrar", detalle: "Armá el ticket y cobrá." },
  { href: "/caja", etiqueta: "Caja", detalle: "Abrir el turno, cargar un gasto o cerrar." },
  { href: "/inventario", etiqueta: "Inventario", detalle: "Abrir un balde o cargar lo que llegó." },
];

/**
 * Lo que ve quien entra y no es dueño: adónde ir. Antes acá había un párrafo
 * que decía que todavía no había módulos, y quedó viejo hace cinco fases.
 */
export function AtajosDeInicio() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {ATAJOS.map((atajo) => (
        <Tarjeta key={atajo.href} compacta className="hover:bg-superficie-honda">
          <Link href={atajo.href} className="flex flex-col gap-1">
            <span className="font-display text-lg font-semibold">{atajo.etiqueta}</span>
            <span className="text-sm text-texto-suave">{atajo.detalle}</span>
          </Link>
        </Tarjeta>
      ))}
    </div>
  );
}
