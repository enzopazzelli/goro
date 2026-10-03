import { unParametro } from "@/lib/parametros";
import { periodoPedido } from "@/lib/periodos";
import { exigirPerfil } from "@/modulos/auth/consultas/perfil";
import { SeccionHistorial } from "@/modulos/ventas/componentes/SeccionHistorial";
import { esMedioDePago } from "@/modulos/ventas/tipos";

export const metadata = { title: "Historial" };

export default async function Historial(props: PageProps<"/historial">) {
  const parametros = await props.searchParams;
  const medio = unParametro(parametros.medio);
  const perfil = await exigirPerfil();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold">Historial</h1>
        <p className="text-texto-suave">Buscá una venta, abrí su ticket y anulala si hace falta.</p>
      </header>

      <SeccionHistorial
        periodo={periodoPedido({
          desde: unParametro(parametros.desde),
          hasta: unParametro(parametros.hasta),
        })}
        medioPago={esMedioDePago(medio) ? medio : null}
        esDuenio={perfil.rol === "duenio"}
      />
    </div>
  );
}
