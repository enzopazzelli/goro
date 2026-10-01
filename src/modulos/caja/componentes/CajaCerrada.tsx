import { BotonAbrirCaja } from "@/componentes/ModalAbrirCaja";
import { Tarjeta } from "@/componentes/Tarjeta";

export function CajaCerrada() {
  return (
    <Tarjeta className="items-center text-center">
      <span aria-hidden="true" className="text-3xl">
        🔒
      </span>
      <div>
        <h2 className="font-display text-lg font-semibold">La caja está cerrada</h2>
        <p className="text-sm text-texto-suave">
          Para poder cobrar hay que abrirla contando lo que hay en el cajón.
        </p>
      </div>
      <BotonAbrirCaja />
    </Tarjeta>
  );
}
