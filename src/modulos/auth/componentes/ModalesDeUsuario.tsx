"use client";

import { Campo } from "@/componentes/Campo";
import { Modal } from "@/componentes/Modal";
import { borrarUsuario } from "../consultas/accionesBaja";
import { cambiarContrasena, crearUsuario, editarUsuario } from "../consultas/accionesUsuarios";
import type { Perfil } from "../tipos";
import { CampoContrasena, CampoUsuario } from "./CamposDeUsuario";
import { RolYPermisos } from "./CamposDePermisos";
import { PieDeModal } from "./PieDeModal";
import { useAccionDeUsuario } from "./useAccionDeUsuario";

type Cierre = { onCerrar: () => void; alTerminar: (aviso?: string) => void };

export function ModalNuevoUsuario({ onCerrar, alTerminar }: Cierre) {
  const [estado, accion, enviando] = useAccionDeUsuario(crearUsuario, alTerminar);

  return (
    <Modal abierto onCerrar={onCerrar} titulo="Nuevo usuario" cerrarConClicAfuera={false}>
      <form action={accion} className="flex flex-col gap-3">
        <Campo etiqueta="Nombre" name="nombre" placeholder="Ana Ruiz" required />
        <CampoUsuario />
        <CampoContrasena />
        <RolYPermisos rolInicial="colaborador" />
        <PieDeModal
          error={estado.error}
          enviando={enviando}
          onCancelar={onCerrar}
          texto="Crear usuario"
          textoEnviando="Creando…"
        />
      </form>
    </Modal>
  );
}

export function ModalEditarUsuario({
  perfil,
  esPropio,
  onCerrar,
  alTerminar,
}: Cierre & { perfil: Perfil; esPropio: boolean }) {
  const [estado, accion, enviando] = useAccionDeUsuario(editarUsuario, alTerminar);

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo={`Editar a ${perfil.nombre}`}
      cerrarConClicAfuera={false}
    >
      <form action={accion} className="flex flex-col gap-3">
        <input type="hidden" name="id" value={perfil.id} />
        <Campo etiqueta="Nombre" name="nombre" defaultValue={perfil.nombre} required />
        <CampoUsuario inicial={perfil.usuario} />
        <RolYPermisos
          rolInicial={perfil.rol}
          permisosIniciales={perfil.permisos}
          rolFijo={esPropio}
        />
        <PieDeModal
          error={estado.error}
          enviando={enviando}
          onCancelar={onCerrar}
          texto="Guardar"
          textoEnviando="Guardando…"
        />
      </form>
    </Modal>
  );
}

export function ModalContrasena({ perfil, onCerrar, alTerminar }: Cierre & { perfil: Perfil }) {
  const [estado, accion, enviando] = useAccionDeUsuario(cambiarContrasena, alTerminar);

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo={`Contraseña de ${perfil.nombre}`}
      cerrarConClicAfuera={false}
    >
      <form action={accion} className="flex flex-col gap-3">
        <input type="hidden" name="id" value={perfil.id} />
        <p className="text-sm text-texto-suave">
          La anterior deja de servir. Después tenés que decirle la nueva.
        </p>
        <CampoContrasena etiqueta="Contraseña nueva" />
        <PieDeModal
          error={estado.error}
          enviando={enviando}
          onCancelar={onCerrar}
          texto="Cambiar contraseña"
          textoEnviando="Cambiando…"
        />
      </form>
    </Modal>
  );
}

export function ModalBorrarUsuario({ perfil, onCerrar, alTerminar }: Cierre & { perfil: Perfil }) {
  const [estado, accion, enviando] = useAccionDeUsuario(borrarUsuario, alTerminar);

  return (
    <Modal abierto onCerrar={onCerrar} titulo={`¿Borrar a ${perfil.nombre}?`}>
      <form action={accion} className="flex flex-col gap-3">
        <input type="hidden" name="id" value={perfil.id} />
        <p className="text-sm text-texto-suave">
          Si nunca vendió ni movió la caja, se borra y desaparece de la lista. Si ya tiene historial
          no se puede borrar: queda <strong>desactivado</strong> y no puede entrar más, pero sus
          ventas siguen a su nombre.
        </p>
        <PieDeModal
          error={estado.error}
          enviando={enviando}
          onCancelar={onCerrar}
          texto="Borrar"
          textoEnviando="Borrando…"
          peligro
        />
      </form>
    </Modal>
  );
}
