"use client";

import { useState } from "react";
import { Boton } from "@/componentes/Boton";
import type { Perfil } from "../tipos";
import { FilaUsuario, type AccionDeFila } from "./FilaUsuario";
import {
  ModalBorrarUsuario,
  ModalContrasena,
  ModalEditarUsuario,
  ModalNuevoUsuario,
} from "./ModalesDeUsuario";

type ModalAbierto = { tipo: "nuevo" } | { tipo: AccionDeFila; perfil: Perfil } | null;

/**
 * El modal y el aviso viven acá y no en cada fila: cuando un usuario se borra,
 * su fila desaparece, y con ella se iría el mensaje que dice qué pasó.
 */
export function TablaUsuarios({ perfiles, yoId }: { perfiles: Perfil[]; yoId: string }) {
  const [modal, setModal] = useState<ModalAbierto>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const cerrar = () => setModal(null);
  const alTerminar = (texto?: string) => {
    setAviso(texto ?? null);
    setModal(null);
  };
  const abrir = (siguiente: ModalAbierto) => {
    setAviso(null);
    setModal(siguiente);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-sm text-texto">
          {aviso}
        </p>
        <Boton type="button" onClick={() => abrir({ tipo: "nuevo" })}>
          Nuevo usuario
        </Boton>
      </div>

      <div className="overflow-x-auto rounded-(--r-grande) border border-linea bg-superficie">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-linea font-mono text-xs text-texto-suave uppercase">
            <tr>
              <th className="p-3 font-normal">Usuario</th>
              <th className="p-3 font-normal">Nombre</th>
              <th className="p-3 font-normal">Rol</th>
              <th className="p-3 font-normal">Puede, además de vender</th>
              <th className="p-3 font-normal">Estado</th>
              <th className="p-3 font-normal"></th>
            </tr>
          </thead>
          <tbody>
            {perfiles.map((perfil) => (
              <FilaUsuario
                key={perfil.id}
                perfil={perfil}
                esPropio={perfil.id === yoId}
                onAccion={(tipo) => abrir({ tipo, perfil })}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Se montan al abrir: cada vez arrancan en limpio, sin el error de la vez anterior. */}
      {modal?.tipo === "nuevo" && <ModalNuevoUsuario onCerrar={cerrar} alTerminar={alTerminar} />}
      {modal?.tipo === "editar" && (
        <ModalEditarUsuario
          perfil={modal.perfil}
          esPropio={modal.perfil.id === yoId}
          onCerrar={cerrar}
          alTerminar={alTerminar}
        />
      )}
      {modal?.tipo === "contrasena" && (
        <ModalContrasena perfil={modal.perfil} onCerrar={cerrar} alTerminar={alTerminar} />
      )}
      {modal?.tipo === "borrar" && (
        <ModalBorrarUsuario perfil={modal.perfil} onCerrar={cerrar} alTerminar={alTerminar} />
      )}
    </div>
  );
}
