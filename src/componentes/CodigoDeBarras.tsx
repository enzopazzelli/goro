import { anchoEnModulos, barrasDe } from "@/lib/codigos/code128";

type Props = {
  valor: string;
  /** Alto de las barras en módulos. Más alto = más fácil de enganchar. */
  alto?: number;
};

/**
 * Dibuja un Code 128 como SVG. Sin canvas y sin imagen: se imprime nítido a
 * cualquier tamaño, que es justamente de lo que depende que la pistola lo lea.
 *
 * El número va impreso debajo a propósito: si el lector falla, alguien lo
 * tiene que poder tipear a mano.
 */
export function CodigoDeBarras({ valor, alto = 40 }: Props) {
  const ancho = anchoEnModulos(valor);

  return (
    <figure className="flex flex-col items-center gap-1">
      <svg
        viewBox={`0 0 ${ancho} ${alto}`}
        // Las barras se estiran a lo ancho del contenedor; los anchos
        // relativos entre ellas —lo único que el lector mide— no cambian.
        preserveAspectRatio="none"
        // Sin esto el navegador suaviza los bordes y en papel chico las
        // barras finas se lavan.
        shapeRendering="crispEdges"
        className="h-10 w-full"
        role="img"
        aria-label={`Código de barras ${valor}`}
      >
        <rect width={ancho} height={alto} fill="var(--codigo-fondo)" />
        <g fill="var(--codigo-barra)">
          {barrasDe(valor).map((barra) => (
            <rect key={barra.x} x={barra.x} y={0} width={barra.ancho} height={alto} />
          ))}
        </g>
      </svg>
      <figcaption className="numero text-xs tracking-[0.12em] text-texto">{valor}</figcaption>
    </figure>
  );
}
