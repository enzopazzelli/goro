"use client";

import { Punto } from "@/componentes/Punto";
import type { Balde } from "@/lib/baldes";
import { formatearPlata } from "@/lib/plata";
import { precioDeBalde } from "@/lib/precioBalde";
import type { Sabor } from "@/lib/sabores";
import type { ItemEnCarrito } from "../tipos";
import { DETALLE, NOMBRE, PRECIO, ROTULO_DE_GRUPO, TARJETA, TARJETA_LIBRE } from "./estilosDeVenta";

/**
 * Los sabores de los que hay un balde cerrado para vender entero. Un balde
 * abierto no se ofrece: ya se está sirviendo, y vender "entero" lo que está a
 * medias no es vender un balde.
 *
 * El cajero no elige cuál: la base saca el cerrado más viejo. Y no ofrece
 * nada sin precio — el aviso dice cómo ponerlo, en vez de dejar un botón que
 * después falla al cobrar.
 */
export function SelectorDeBaldes({
  sabores,
  baldes,
  precioPorDefecto,
  onAgregar,
}: {
  sabores: Sabor[];
  baldes: Balde[];
  precioPorDefecto: number | null;
  onAgregar: (item: ItemEnCarrito) => void;
}) {
  const ofertas = sabores
    .filter((sabor) => sabor.activo)
    .map((sabor) => ({
      sabor,
      cerrados: baldes.filter((b) => b.saborId === sabor.id && b.estado === "cerrado").length,
      precio: precioDeBalde(sabor, precioPorDefecto),
    }))
    .filter((oferta) => oferta.cerrados > 0);

  if (ofertas.length === 0) return null;

  return (
    <div>
      <p className={ROTULO_DE_GRUPO}>Balde entero</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ofertas.map(({ sabor, cerrados, precio }) => (
          <button
            key={sabor.id}
            type="button"
            disabled={precio === null}
            onClick={() =>
              precio !== null &&
              onAgregar({
                tipo: "balde",
                saborId: sabor.id,
                nombre: `Balde entero · ${sabor.nombre}`,
                precio,
                saboresNombres: [sabor.nombre],
              })
            }
            className={`${TARJETA} ${TARJETA_LIBRE} disabled:opacity-55`}
          >
            <span className={`flex items-center gap-1.5 ${NOMBRE}`}>
              <Punto color={sabor.color} /> {sabor.nombre}
            </span>
            <span className={DETALLE}>
              {cerrados} cerrado{cerrados === 1 ? "" : "s"}
            </span>
            <span className={PRECIO}>
              {precio === null ? "Sin precio" : formatearPlata(precio)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
