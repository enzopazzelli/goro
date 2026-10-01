import Link from "next/link";
import { Insignia } from "./Insignia";

/** Visible desde cualquier pantalla: antes de cobrar, se sabe si la caja está abierta. */
export function InsigniaCaja({ abierta }: { abierta: boolean }) {
  return (
    <Link href="/caja" className="self-center">
      <Insignia variante={abierta ? "ok" : "alerta"}>
        {abierta ? "Caja abierta" : "Caja cerrada"}
      </Insignia>
    </Link>
  );
}
