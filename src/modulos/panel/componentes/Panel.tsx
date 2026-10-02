import type { ReactNode } from "react";
import { FiltroDePeriodo } from "@/componentes/FiltroDePeriodo";
import { Tarjeta } from "@/componentes/Tarjeta";
import { diaCorto, periodoAnterior, type Periodo } from "@/lib/periodos";
import { resumenDelPeriodo } from "../consultas/panel";
import { totalesDelPeriodo } from "../resumen";
import { KilosPorSabor } from "./KilosPorSabor";
import { MargenDelPeriodo } from "./MargenDelPeriodo";
import { RankingDeArticulos } from "./RankingDeArticulos";
import { TotalesDelPeriodo } from "./TotalesDelPeriodo";
import { VentasPorDiaSemana } from "./VentasPorDiaSemana";
import { VentasPorHora } from "./VentasPorHora";

function Seccion({
  titulo,
  bajada,
  children,
}: {
  titulo: string;
  bajada: string;
  children: ReactNode;
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
  const { porMedio, porMedioAnterior, porHora, porSabor, porDia, porArticulo, costo } =
    await resumenDelPeriodo(periodo);
  const { total } = totalesDelPeriodo(porMedio);

  return (
    <div className="flex flex-col gap-4">
      <Tarjeta>
        <FiltroDePeriodo ruta="/inicio" periodo={periodo} />
        <div className="border-t border-linea pt-4">
          <TotalesDelPeriodo
            porMedio={porMedio}
            porMedioAnterior={porMedioAnterior}
            anterior={periodoAnterior(periodo)}
          />
        </div>
      </Tarjeta>

      <Seccion
        titulo="Margen"
        bajada="Lo cobrado menos lo que costó lo que salió. Bruto: no descuenta sueldos, alquiler ni los gastos de la caja."
      >
        <MargenDelPeriodo vendido={total} costo={costo} />
      </Seccion>

      <Seccion titulo="Ventas por hora" bajada={bajadaDelGrafico(periodo)}>
        <VentasPorHora porHora={porHora} />
      </Seccion>

      {/* Con un día solo en el filtro, agrupar por día de la semana es una fila
          sola repitiendo el total de arriba. */}
      {porDia.length > 1 && (
        <Seccion
          titulo="Días de la semana"
          bajada="El promedio de cada día en el período, para saber cuándo hace falta más gente."
        >
          <VentasPorDiaSemana porDia={porDia} />
        </Seccion>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Seccion titulo="Sabores" bajada="Los kilos que salieron de los baldes, de mayor a menor.">
          <KilosPorSabor porSabor={porSabor} />
        </Seccion>

        <Seccion titulo="Artículos" bajada="Qué se vendió, en unidades y en plata.">
          <RankingDeArticulos porArticulo={porArticulo} />
        </Seccion>
      </div>
    </div>
  );
}
