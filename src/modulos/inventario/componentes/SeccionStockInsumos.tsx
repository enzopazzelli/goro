import { listarInsumos } from "../consultas/insumos";
import { TablaInsumos } from "./TablaInsumos";

export async function SeccionStockInsumos({ esDuenio }: { esDuenio: boolean }) {
  const insumos = await listarInsumos();
  return <TablaInsumos insumos={insumos} esDuenio={esDuenio} />;
}
