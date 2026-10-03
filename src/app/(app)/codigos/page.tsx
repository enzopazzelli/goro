import { BotonImprimir } from "@/componentes/BotonImprimir";
import { CodigoDeBarras } from "@/componentes/CodigoDeBarras";
import { EtiquetaDeCodigo } from "@/componentes/EtiquetaDeCodigo";
import { HojaDeEtiquetas } from "@/componentes/HojaDeEtiquetas";
import { Pestanas } from "@/componentes/Pestanas";
import { listarBaldes } from "@/lib/baldes";
import { generarCodigo } from "@/lib/codigos/codigo";
import { formatearKilos } from "@/lib/kilos";
import { listarSabores } from "@/lib/sabores";
import { listarInsumos } from "@/modulos/inventario/consultas/insumos";

export const metadata = { title: "Códigos" };

/* Las muestras sirven para la prueba física de la pistola (paso 0.2 del
   ROADMAP): imprimirlas y pasarles el lector. Existen para contestar la única
   pregunta que ningún test puede contestar: si la tabla de patrones de Code 128
   quedó bien transcrita. */
const MUESTRA = [
  { codigo: generarCodigo("P", 1), que: "Pote armado" },
  { codigo: generarCodigo("P", 1234), que: "Pote armado" },
  { codigo: generarCodigo("A", 1), que: "Artículo (insumo)" },
  { codigo: generarCodigo("B", 1), que: "Balde" },
];

function Encabezado({ titulo, bajada }: { titulo: string; bajada: string }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 className="font-display text-lg font-semibold">{titulo}</h2>
        <p className="text-sm text-texto-suave">{bajada}</p>
      </div>
      <BotonImprimir>Imprimir esta hoja</BotonImprimir>
    </header>
  );
}

export default async function Codigos() {
  const [insumos, baldes, sabores] = await Promise.all([
    listarInsumos(),
    listarBaldes(),
    listarSabores(),
  ]);
  const nombresDeSabor = new Map(sabores.map((sabor) => [sabor.id, sabor.nombre]));

  // Los envases de los formatos cuelgan de su formato y no se piden por código.
  const articulos = insumos.filter((insumo) => insumo.tipo !== "envase" && insumo.activo);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold">Códigos</h1>
        <p className="text-texto-suave">
          Etiquetas para imprimir. Los potes se imprimen desde su propia pantalla, cuando se arman.
        </p>
      </header>

      <Pestanas
        tabs={[
          {
            etiqueta: "Insumos y productos",
            contenido: (
              <div className="flex flex-col gap-3">
                <Encabezado
                  titulo="Hoja de códigos de artículos"
                  bajada="Se imprime una vez: se pega en el estante donde para cada cosa y se cuelga en el lugar donde se recibe la mercadería."
                />
                <HojaDeEtiquetas>
                  {articulos.map((articulo) => (
                    <EtiquetaDeCodigo
                      key={articulo.id}
                      titulo={articulo.nombre}
                      detalle={articulo.tipo === "producto" ? "Producto" : "Insumo"}
                      codigo={articulo.codigo}
                    />
                  ))}
                </HojaDeEtiquetas>
              </div>
            ),
          },
          {
            etiqueta: "Baldes",
            contenido: (
              <div className="flex flex-col gap-3">
                <Encabezado
                  titulo="Etiquetas de los baldes"
                  bajada="Cada balde tiene su código desde que entra. Imprimí la hoja y pegá cada etiqueta en su balde."
                />
                {baldes.length === 0 ? (
                  <p className="text-sm text-texto-suave">No hay baldes en el local.</p>
                ) : (
                  <HojaDeEtiquetas>
                    {baldes.map((balde) => (
                      <EtiquetaDeCodigo
                        key={balde.id}
                        titulo={nombresDeSabor.get(balde.saborId) ?? ""}
                        detalle={`Balde · ${formatearKilos(balde.kgInicial)}`}
                        codigo={balde.codigo}
                      />
                    ))}
                  </HojaDeEtiquetas>
                )}
              </div>
            ),
          },
          {
            etiqueta: "Prueba de la pistola",
            contenido: (
              <div className="flex flex-col gap-3">
                <Encabezado
                  titulo="Prueba de la pistola"
                  bajada="Imprimí esta hoja y escaneá cada código. Anotá cuáles lee la pistola de fábrica y si agrega Enter al final."
                />
                <ul id="hoja-de-etiquetas" className="grid gap-4 sm:grid-cols-2">
                  {MUESTRA.map(({ codigo, que }) => (
                    <li
                      key={codigo}
                      className="rounded-(--r-grande) border border-linea bg-superficie p-4"
                    >
                      <p className="mb-2 text-xs text-texto-suave uppercase">{que}</p>
                      <CodigoDeBarras valor={codigo} />
                    </li>
                  ))}
                </ul>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
