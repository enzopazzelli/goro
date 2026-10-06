import { Boton } from "@/componentes/Boton";

/**
 * Abre el detalle de una fila. Era una flechita suelta de texto chico: se
 * pasaba de largo y no se sabía que ahí estaban la edición y los baldes.
 */
export function BotonDesplegar({
  expandida,
  onAlternar,
}: {
  expandida: boolean;
  onAlternar: () => void;
}) {
  return (
    <Boton
      type="button"
      variante="fantasma"
      tamano="chico"
      onClick={onAlternar}
      aria-expanded={expandida}
      aria-label={expandida ? "Cerrar el detalle" : "Ver el detalle"}
    >
      {expandida ? "▲" : "▼"}
    </Boton>
  );
}
