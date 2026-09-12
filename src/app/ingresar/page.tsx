import { NOMBRE_COMERCIO } from "@/config/comercio";
import { FormularioIngreso } from "@/modulos/auth/componentes/FormularioIngreso";

export const metadata = { title: "Entrar" };

export default function Ingresar() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-(--r-grande) border border-linea bg-superficie p-8 shadow-sm">
        <header className="mb-6 flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold">{NOMBRE_COMERCIO}</h1>
          <p className="text-sm text-texto-suave">Entrá con tu usuario.</p>
        </header>

        <FormularioIngreso />
      </div>
    </main>
  );
}
