import { periodoPedido } from "@/lib/periodos";
import { SeccionHistorial } from "@/modulos/ventas/componentes/SeccionHistorial";
import { esMedioDePago } from "@/modulos/ventas/tipos";

export const metadata = { title: "Historial" };

/** Un parámetro repetido en la URL (`?medio=a&medio=b`) llega como lista: vale el primero. */
function uno(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

export default async function Historial(props: PageProps<"/historial">) {
  const parametros = await props.searchParams;
  const medio = uno(parametros.medio);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold">Historial</h1>
        <p className="text-texto-suave">Buscá una venta, abrí su ticket y anulala si hace falta.</p>
      </header>

      <SeccionHistorial
        periodo={periodoPedido({ desde: uno(parametros.desde), hasta: uno(parametros.hasta) })}
        medioPago={esMedioDePago(medio) ? medio : null}
      />
    </div>
  );
}
