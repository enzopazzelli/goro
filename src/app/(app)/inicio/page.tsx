import { exigirPerfil } from "@/modulos/auth/consultas/perfil";
import { ETIQUETA_ROL } from "@/modulos/auth/tipos";

export const metadata = { title: "Inicio" };

export default async function Inicio() {
  const perfil = await exigirPerfil();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold">Hola, {perfil.nombre}</h1>
        <p className="text-texto-suave">
          Entraste como <strong className="numero">{perfil.usuario}</strong> ·{" "}
          {ETIQUETA_ROL[perfil.rol]}
        </p>
      </header>

      <section className="rounded-(--r-grande) border border-linea bg-superficie p-6">
        <h2 className="font-display text-lg font-semibold">Todavía no hay módulos</h2>
        <p className="mt-1 text-sm text-texto-suave">
          Esto es el núcleo: entrar, saber quién sos y qué podés ver. Vender, Stock y Caja vienen en
          las fases siguientes del roadmap.
        </p>
      </section>
    </div>
  );
}
