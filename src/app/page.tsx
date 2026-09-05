import { generarCodigo } from "@/lib/codigos/codigo";
import { CodigoDeBarras } from "@/componentes/CodigoDeBarras";

/* Página de arranque provisoria. Existe para una sola cosa: imprimir un
   código real y poder escanearlo con la pistola de Goro (paso 0.2 del
   ROADMAP). Se reemplaza por el login cuando entre el núcleo (Fase 1). */
export default function Inicio() {
  const muestra = [
    generarCodigo("P", 1),
    generarCodigo("P", 2),
    generarCodigo("A", 1),
    generarCodigo("C", 1),
  ];

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 p-8">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold">Goro</h1>
        <p className="text-texto-suave">
          Sistema de gestión. El núcleo todavía no está: esto es la prueba de la pistola.
        </p>
      </header>

      <section className="flex flex-col gap-4 rounded-(--r-grande) border border-linea bg-superficie p-6">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-xl font-semibold">Códigos de prueba</h2>
          <p className="text-sm text-texto-suave">
            Imprimí esta página y escaneá cada código. Anotá cuáles lee la pistola de fábrica y si
            agrega Enter al final.
          </p>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2">
          {muestra.map((codigo) => (
            <li key={codigo} className="rounded-(--r) border border-linea p-4">
              <CodigoDeBarras valor={codigo} />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
