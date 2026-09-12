import { BarraLateral } from "@/componentes/BarraLateral";
import { exigirPerfil } from "@/modulos/auth/consultas/perfil";

/* El perfil se pide acá, contra la base, en cada request. El proxy ya redirigió
   a quien no tiene sesión, pero eso era un chequeo optimista: la verdad se
   pregunta acá. */
export default async function LayoutApp({ children }: LayoutProps<"/">) {
  const perfil = await exigirPerfil();

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <BarraLateral perfil={perfil} />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
