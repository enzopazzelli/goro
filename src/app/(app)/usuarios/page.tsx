import { TablaUsuarios } from "@/modulos/auth/componentes/TablaUsuarios";
import { exigirDuenio } from "@/modulos/auth/consultas/perfil";
import { listarPerfiles } from "@/modulos/auth/consultas/usuarios";

export const metadata = { title: "Usuarios" };

export default async function Usuarios() {
  // Doble llave: el menú no muestra el ítem, esto redirige si alguien entra
  // por URL, y RLS no le devolvería las filas ajenas igual. Las acciones de la
  // tabla vuelven a verificar que quien pide es dueño: ocultar la pantalla no
  // es una barrera.
  const yo = await exigirDuenio();
  const perfiles = await listarPerfiles();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold">Usuarios</h1>
        <p className="text-texto-suave">Quién entra al sistema y con qué rol.</p>
      </header>

      <TablaUsuarios perfiles={perfiles} yoId={yo.id} />
    </div>
  );
}
