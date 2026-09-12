import { exigirDuenio } from "@/modulos/auth/consultas/perfil";
import { listarPerfiles } from "@/modulos/auth/consultas/usuarios";
import { ETIQUETA_ROL } from "@/modulos/auth/tipos";

export const metadata = { title: "Usuarios" };

export default async function Usuarios() {
  // Doble llave: el menú no muestra el ítem, esto redirige si alguien entra
  // por URL, y RLS no le devolvería las filas ajenas igual.
  await exigirDuenio();
  const perfiles = await listarPerfiles();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold">Usuarios</h1>
        <p className="text-texto-suave">Quién entra al sistema y con qué rol.</p>
      </header>

      <div className="overflow-x-auto rounded-(--r-grande) border border-linea bg-superficie">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-linea text-xs text-texto-suave uppercase">
            <tr>
              <th className="p-3">Usuario</th>
              <th className="p-3">Nombre</th>
              <th className="p-3">Rol</th>
              <th className="p-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {perfiles.map((perfil) => (
              <tr key={perfil.id} className="border-b border-linea last:border-0">
                <td className="numero p-3">{perfil.usuario}</td>
                <td className="p-3">{perfil.nombre}</td>
                <td className="p-3">{ETIQUETA_ROL[perfil.rol]}</td>
                <td className="p-3">
                  {perfil.activo ? (
                    <span className="rounded-(--r) bg-ok-fondo px-2 py-1 text-xs text-ok">
                      Activo
                    </span>
                  ) : (
                    <span className="rounded-(--r) bg-alerta-fondo px-2 py-1 text-xs text-alerta">
                      Inactivo
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-texto-suave">
        Dar de alta y editar usuarios desde acá es la Fase 9. Por ahora se crean desde Supabase (ver{" "}
        <code className="numero">supabase/README.md</code>).
      </p>
    </div>
  );
}
