import { CodigoDeBarras } from "@/componentes/CodigoDeBarras";
import { generarCodigo } from "@/lib/codigos/codigo";

export const metadata = { title: "Códigos" };

/* Pantalla del paso 0.2 del ROADMAP: imprimirla y pasarle la pistola. Existe
   para contestar la única pregunta que ningún test puede contestar — si la
   tabla de patrones de Code 128 quedó bien transcrita. */
const MUESTRA = [
  { codigo: generarCodigo("P", 1), que: "Pote armado" },
  { codigo: generarCodigo("P", 1234), que: "Pote armado" },
  { codigo: generarCodigo("A", 1), que: "Artículo (insumo)" },
  { codigo: generarCodigo("C", 1), que: "Bachada" },
];

export default function Codigos() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold">Códigos de prueba</h1>
        <p className="text-texto-suave">
          Imprimí esta pantalla y escaneá cada código. Anotá cuáles lee la pistola de fábrica y si
          agrega Enter al final.
        </p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2">
        {MUESTRA.map(({ codigo, que }) => (
          <li key={codigo} className="rounded-(--r-grande) border border-linea bg-superficie p-4">
            <p className="mb-2 text-xs text-texto-suave uppercase">{que}</p>
            <CodigoDeBarras valor={codigo} />
          </li>
        ))}
      </ul>
    </div>
  );
}
