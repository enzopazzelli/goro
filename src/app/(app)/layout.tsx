import { BarraLateral } from "@/componentes/BarraLateral";
import { turnoAbierto } from "@/lib/caja";
import { exigirPerfil } from "@/modulos/auth/consultas/perfil";

/* El perfil se pide acá, contra la base, en cada request. El proxy ya redirigió
   a quien no tiene sesión, pero eso era un chequeo optimista: la verdad se
   pregunta acá. */
export default async function LayoutApp({ children }: LayoutProps<"/">) {
  const [perfil, turno] = await Promise.all([exigirPerfil(), turnoAbierto()]);

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <BarraLateral perfil={perfil} cajaAbierta={turno !== null} />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
