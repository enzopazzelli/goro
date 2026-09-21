import { obtenerConfigComercio } from "@/lib/configComercio";
import { listarBaldes } from "@/lib/baldes";
import { kgPorSabor } from "@/lib/kgPorSabor";
import { listarSabores } from "@/lib/sabores";
import { saborEnAlerta } from "../alerta";
import { TablaSabores, type FilaSaborVista } from "./TablaSabores";

export async function SeccionStockSabores({ esDuenio }: { esDuenio: boolean }) {
  const [sabores, baldes, config] = await Promise.all([
    listarSabores(),
    listarBaldes(),
    obtenerConfigComercio(),
  ]);
  const kgPorSaborId = kgPorSabor(baldes);

  const filas: FilaSaborVista[] = sabores
    .filter((sabor) => sabor.activo)
    .map((sabor) => {
      const deEsteSabor = baldes.filter((balde) => balde.saborId === sabor.id);
      const abierto = deEsteSabor.find((balde) => balde.estado === "abierto") ?? null;
      const kgRestanteTotal = kgPorSaborId[sabor.id] ?? 0;
      const kgInicialTotal = deEsteSabor.reduce((suma, balde) => suma + balde.kgInicial, 0);
      const pct = kgInicialTotal > 0 ? (kgRestanteTotal / kgInicialTotal) * 100 : 0;

      let insignia: FilaSaborVista["insignia"];
      if (!abierto) {
        insignia = { variante: "alerta", texto: "Sin balde abierto" };
      } else if (saborEnAlerta(sabor, abierto, config.stockMinimoDefault)) {
        insignia = { variante: "advertencia", texto: "Se está por acabar" };
      } else {
        insignia = { variante: "ok", texto: "Ok" };
      }

      return { sabor, baldes: deEsteSabor, pct, insignia, baldeAbiertoId: abierto?.id ?? null };
    });

  return <TablaSabores filas={filas} esDuenio={esDuenio} />;
}
