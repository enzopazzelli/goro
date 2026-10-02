import { AtajosDeInicio } from "@/componentes/AtajosDeInicio";
import { unParametro } from "@/lib/parametros";
import { periodoPedido } from "@/lib/periodos";
import { exigirPerfil } from "@/modulos/auth/consultas/perfil";
import { ETIQUETA_ROL } from "@/modulos/auth/tipos";
import { Panel } from "@/modulos/panel/componentes/Panel";

export const metadata = { title: "Inicio" };

export default async function Inicio(props: PageProps<"/inicio">) {
  const [perfil, parametros] = await Promise.all([exigirPerfil(), props.searchParams]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold">Hola, {perfil.nombre}</h1>
        <p className="text-texto-suave">
          Entraste como <strong className="numero">{perfil.usuario}</strong> ·{" "}
          {ETIQUETA_ROL[perfil.rol]}
        </p>
      </header>

      {/* El panel es para el dueño: es el que decide con estos números. La
          barrera de verdad no es este `if` — un colaborador ya ve cada venta en
          el Historial —, es que el arqueo de caja sigue siendo solo del dueño. */}
      {perfil.rol === "duenio" ? (
        <Panel
          periodo={periodoPedido({
            desde: unParametro(parametros.desde),
            hasta: unParametro(parametros.hasta),
          })}
        />
      ) : (
        <AtajosDeInicio />
      )}
    </div>
  );
}
