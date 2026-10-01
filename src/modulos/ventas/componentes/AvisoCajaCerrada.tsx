import { BotonAbrirCaja } from "@/componentes/ModalAbrirCaja";

/** Arriba de todo: nadie tiene que armar un carrito para enterarse recién al cobrar. */
export function AvisoCajaCerrada() {
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-3 rounded-(--r-grande) border border-alerta bg-alerta-fondo p-4"
    >
      <div>
        <p className="font-semibold text-alerta">La caja está cerrada</p>
        <p className="text-sm text-texto">Abrila para poder cobrar.</p>
      </div>
      <BotonAbrirCaja />
    </div>
  );
}
