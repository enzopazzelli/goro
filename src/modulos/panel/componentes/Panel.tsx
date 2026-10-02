import { FiltroDePeriodo } from "@/componentes/FiltroDePeriodo";
import { Tarjeta } from "@/componentes/Tarjeta";
import { diaCorto, type Periodo } from "@/lib/periodos";
import { resumenDelPeriodo } from "../consultas/panel";
import { KilosPorSabor } from "./KilosPorSabor";
import { TotalesDelPeriodo } from "./TotalesDelPeriodo";
import { VentasPorHora } from "./VentasPorHora";

function Seccion({
  titulo,
  bajada,
  children,
}: {
  titulo: string;
  bajada: string;
  children: React.ReactNode;
}) {
  return (
    <Tarjeta>
      <header>
        <h2 className="font-display text-lg font-semibold">{titulo}</h2>
        <p className="text-sm text-texto-suave">{bajada}</p>
      </header>
      {children}
    </Tarjeta>
  );
}

/** Cuántos días abarca el período, para avisar qué se está sumando en el gráfico. */
function bajadaDelGrafico(periodo: Periodo): string {
  if (periodo.desde === periodo.hasta) return "Lo cobrado en cada hora del día.";

  return `Lo cobrado en cada hora, sumando todos los días del ${diaCorto(periodo.desde)} al ${diaCorto(periodo.hasta)}. Un martes y un sábado entran juntos.`;
}

export async function Panel({ periodo }: { periodo: Periodo }) {
  const { porMedio, porHora, porSabor } = await resumenDelPeriodo(periodo);

  return (
    <div className="flex flex-col gap-4">
      <Tarjeta>
        <FiltroDePeriodo ruta="/inicio" periodo={periodo} />
        <div className="border-t border-linea pt-4">
          <TotalesDelPeriodo porMedio={porMedio} />
        </div>
      </Tarjeta>

      <Seccion titulo="Ventas por hora" bajada={bajadaDelGrafico(periodo)}>
        <VentasPorHora porHora={porHora} />
      </Seccion>

      <Seccion titulo="Sabores" bajada="Los kilos que salieron de los baldes, de mayor a menor.">
        <KilosPorSabor porSabor={porSabor} />
      </Seccion>
    </div>
  );
}
