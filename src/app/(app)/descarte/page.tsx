import { Tarjeta } from "@/componentes/Tarjeta";
import { nombresDePerfiles } from "@/lib/nombresDePerfiles";
import { unParametro } from "@/lib/parametros";
import { periodoDeAtajo, periodoPedido } from "@/lib/periodos";
import { exigirPerfil } from "@/modulos/auth/consultas/perfil";
import { FormularioDescarte } from "@/modulos/descarte/componentes/FormularioDescarte";
import { ListaDeHoy } from "@/modulos/descarte/componentes/ListaDeHoy";
import { ResumenDeDescarte } from "@/modulos/descarte/componentes/ResumenDeDescarte";
import { articulosDescartables, descartesDelPeriodo } from "@/modulos/descarte/consultas/descartes";

export const metadata = { title: "Descarte" };

export default async function Descarte(props: PageProps<"/descarte">) {
  const parametros = await props.searchParams;
  const perfil = await exigirPerfil();
  const esDuenio = perfil.rol === "duenio";

  const [articulos, deHoy, nombres] = await Promise.all([
    articulosDescartables(),
    descartesDelPeriodo(periodoDeAtajo("dia")),
    esDuenio ? nombresDePerfiles() : Promise.resolve(null),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold">Descarte</h1>
        <p className="text-texto-suave">
          Lo que se tira: productos, insumos y envases se cargan acá. El resto de un balde se carga
          con <i>Se terminó</i> en Inventario, y un pote, desde Potes.
        </p>
      </header>

      <Tarjeta>
        <h2 className="font-display text-lg font-semibold">Descartar</h2>
        <FormularioDescarte articulos={articulos} />
      </Tarjeta>

      <Tarjeta>
        <h2 className="font-display text-lg font-semibold">Hoy</h2>
        <ListaDeHoy descartes={deHoy} nombres={nombres} />
      </Tarjeta>

      {esDuenio && (
        <ResumenDeDescarte
          periodo={periodoPedido({
            desde: unParametro(parametros.desde),
            hasta: unParametro(parametros.hasta),
          })}
        />
      )}
    </div>
  );
}
