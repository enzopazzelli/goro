// @vitest-environment node
// Sin jsdom: ahí los clientes de Supabase comparten localStorage y el cliente de servicio
// termina actuando con la sesión de un usuario de prueba, sujeto a RLS.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DOMINIO_INTERNO } from "@/config/comercio";
import { crearUsuarioDePrueba, servicio } from "@/modulos/ventas/utilesRls";

/**
 * Qué NO puede hacer cada rol con los usuarios, y que las reglas de la
 * migración de Usuarios valen aunque el cambio llegue por la API de
 * administración (que es como llegan los de la pantalla).
 *
 * "Siempre queda un dueño activo" no se prueba acá: exigiría desactivar a los
 * dueños reales de la base. Está cubierto en el banco de pruebas local.
 */

type Usuario = Awaited<ReturnType<typeof crearUsuarioDePrueba>>;

async function perfilDe(id: string) {
  const { data } = await servicio
    .from("perfiles")
    .select("usuario, nombre, rol, activo")
    .eq("id", id)
    .maybeSingle();
  return data;
}

describe("RLS: usuarios", () => {
  let colaborador: Usuario;
  let otro: Usuario;
  let duenio: Usuario;
  let turnoDeHistorial: number | null = null;

  beforeAll(async () => {
    colaborador = await crearUsuarioDePrueba("colaborador");
    otro = await crearUsuarioDePrueba("colaborador");
    duenio = await crearUsuarioDePrueba("duenio");
  });

  afterAll(async () => {
    if (turnoDeHistorial) await servicio.from("turnos_caja").delete().eq("id", turnoDeHistorial);
    for (const usuario of [colaborador, otro, duenio]) {
      if (usuario) await servicio.auth.admin.deleteUser(usuario.id);
    }
  });

  it("un colaborador no se hace dueño", async () => {
    await colaborador.cliente.from("perfiles").update({ rol: "duenio" }).eq("id", colaborador.id);
    expect((await perfilDe(colaborador.id))!.rol).toBe("colaborador");
  });

  it("un colaborador no edita ni desactiva a otro", async () => {
    await colaborador.cliente
      .from("perfiles")
      .update({ nombre: "Cambiado", activo: false })
      .eq("id", otro.id);

    const perfil = await perfilDe(otro.id);
    expect(perfil!.nombre).not.toBe("Cambiado");
    expect(perfil!.activo).toBe(true);
  });

  it("un dueño no se cambia el rol ni se desactiva a sí mismo", async () => {
    const rol = await duenio.cliente
      .from("perfiles")
      .update({ rol: "colaborador" })
      .eq("id", duenio.id);
    expect(rol.error?.message).toBe("No podés cambiar tu propio rol ni desactivarte.");

    const activo = await duenio.cliente
      .from("perfiles")
      .update({ activo: false })
      .eq("id", duenio.id);
    expect(activo.error?.message).toBe("No podés cambiar tu propio rol ni desactivarte.");

    expect(await perfilDe(duenio.id)).toMatchObject({ rol: "duenio", activo: true });
  });

  it("el dueño edita nombre, rol y activo de otro", async () => {
    const { error } = await duenio.cliente
      .from("perfiles")
      .update({ nombre: "Otro Editado", activo: false })
      .eq("id", otro.id);
    expect(error).toBeNull();
    expect(await perfilDe(otro.id)).toMatchObject({ nombre: "Otro Editado", activo: false });

    await duenio.cliente.from("perfiles").update({ activo: true }).eq("id", otro.id);
  });

  it("el usuario de ingreso no se edita directo, ni siquiera siendo dueño", async () => {
    const { error } = await duenio.cliente
      .from("perfiles")
      .update({ usuario: "pisado" })
      .eq("id", otro.id);
    expect(error?.code).toBe("42501");
  });

  it("renombrar la cuenta en Auth copia el usuario al perfil", async () => {
    const nuevo = `r-${Date.now()}`;
    const { error } = await servicio.auth.admin.updateUserById(otro.id, {
      email: `${nuevo}@${DOMINIO_INTERNO}`,
      email_confirm: true,
    });
    expect(error).toBeNull();
    expect((await perfilDe(otro.id))!.usuario).toBe(nuevo);
  });

  it("renombrar a un usuario que ya existe falla y no deja nada a medias", async () => {
    const antes = (await perfilDe(otro.id))!.usuario;
    const ocupado = (await perfilDe(colaborador.id))!.usuario;

    const { error } = await servicio.auth.admin.updateUserById(otro.id, {
      email: `${ocupado}@${DOMINIO_INTERNO}`,
      email_confirm: true,
    });
    expect(error).not.toBeNull();
    expect((await perfilDe(otro.id))!.usuario).toBe(antes);
  });

  it("perfil_tiene_historial es solo del dueño, distingue los dos casos y no borra nada", async () => {
    const ajeno = await colaborador.cliente.rpc("perfil_tiene_historial", {
      p_perfil_id: otro.id,
    });
    expect(ajeno.error?.message).toBe("Solo el dueño administra usuarios.");

    const sin = await duenio.cliente.rpc("perfil_tiene_historial", { p_perfil_id: otro.id });
    expect(sin.error).toBeNull();
    expect(sin.data).toBe(false);
    expect(await perfilDe(otro.id)).not.toBeNull();

    // Un turno ya cerrado, insertado directo: da historial sin abrir la caja de nadie.
    const { data: turno } = await servicio
      .from("turnos_caja")
      .insert({ abierto_por: otro.id, cerrado_por: otro.id, cerrado_en: new Date().toISOString() })
      .select("id")
      .single();
    turnoDeHistorial = turno!.id;

    const con = await duenio.cliente.rpc("perfil_tiene_historial", { p_perfil_id: otro.id });
    expect(con.data).toBe(true);
    expect(await perfilDe(otro.id)).toMatchObject({ activo: true });
  });

  it("una cuenta con historial no se puede borrar", async () => {
    const { error } = await servicio.auth.admin.deleteUser(otro.id);
    expect(error).not.toBeNull();
    expect(await perfilDe(otro.id)).not.toBeNull();
  });

  it("una cuenta sin historial se borra con su perfil, con el trigger de perfiles puesto", async () => {
    const descartable = await crearUsuarioDePrueba("colaborador");
    const { error } = await servicio.auth.admin.deleteUser(descartable.id);
    expect(error).toBeNull();
    expect(await perfilDe(descartable.id)).toBeNull();
  });
});
