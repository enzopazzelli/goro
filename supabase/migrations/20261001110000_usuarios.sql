-- ============================================================================
-- Usuarios: que el dueño administre las cuentas desde la pantalla.
-- ============================================================================
-- Crear, renombrar, cambiar la contraseña y borrar una cuenta pasan por la API
-- de administración de Supabase Auth, que usa la clave de servicio y se saltea
-- la RLS. Por eso las reglas que no se negocian viven acá, en triggers: valen
-- venga el cambio de la pantalla, de la API o del panel de Supabase.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- `usuario` deja de editarse directo: es la parte local del correo de Auth, y
-- si se cambiara solo acá la pantalla mostraría un usuario con el que no se
-- puede entrar. Se cambia el correo y el trigger de abajo lo copia.
-- ----------------------------------------------------------------------------
revoke update on public.perfiles from authenticated;
grant update (nombre, rol, activo) on public.perfiles to authenticated;

-- ----------------------------------------------------------------------------
-- Dos reglas sobre perfiles:
--   1. Nadie se cambia el rol ni se desactiva a sí mismo: un clic no puede
--      dejar al dueño afuera de su propio sistema.
--   2. Siempre queda al menos un dueño activo. Sin eso nadie puede volver a dar
--      de alta ni promover a nadie, y la única salida es SQL a mano.
--
-- `security definer` porque el borrado de una cuenta llega en cascada desde
-- auth.users, con un rol de Auth que no tiene permisos sobre esta tabla.
-- ----------------------------------------------------------------------------
create function public.proteger_perfiles()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE'
     and old.id = auth.uid()
     and (new.rol is distinct from old.rol or new.activo is distinct from old.activo) then
    raise exception 'No podés cambiar tu propio rol ni desactivarte.';
  end if;

  if old.rol = 'duenio' and old.activo
     and (tg_op = 'DELETE' or new.rol <> 'duenio' or not new.activo) then
    -- El candado serializa dos degradaciones cruzadas: sin él, cada una ve al
    -- otro dueño todavía activo y pasan las dos (Regla 3, misma idea).
    perform 1 from public.perfiles where rol = 'duenio' and activo for update;

    if not exists (
      select 1 from public.perfiles where rol = 'duenio' and activo and id <> old.id
    ) then
      raise exception 'Tiene que quedar al menos un dueño activo.';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger proteger_perfiles
  before update or delete on public.perfiles
  for each row execute function public.proteger_perfiles();

-- ----------------------------------------------------------------------------
-- Renombrar un usuario es cambiarle el correo interno en Auth. Este trigger
-- copia la parte local al perfil dentro de la misma transacción: se escribe en
-- un solo lugar y nunca quedan desfasados. Si el usuario nuevo está repetido o
-- mal formado, las restricciones de perfiles hacen fallar el cambio entero.
-- ----------------------------------------------------------------------------
create function public.sincronizar_usuario()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.perfiles set usuario = split_part(new.email, '@', 1) where id = new.id;
  return new;
end;
$$;

create trigger al_cambiar_correo
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.sincronizar_usuario();

-- ----------------------------------------------------------------------------
-- ¿Se puede borrar este usuario, o hay que desactivarlo? Si ya vendió, movió la
-- caja o cargó stock, su fila la referencian esas tablas y no se puede ir.
--
-- No lleva una lista de tablas: ENSAYA el borrado y lo deshace. Si una clave
-- foránea lo frena, tiene historial. Así no queda desactualizada el día que una
-- tabla nueva guarde quién hizo algo. El borrado de verdad lo hace Auth, que se
-- lleva el perfil en cascada.
-- ----------------------------------------------------------------------------
create function public.perfil_tiene_historial(p_perfil_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.es_duenio() then
    raise exception 'Solo el dueño administra usuarios.';
  end if;

  begin
    delete from public.perfiles where id = p_perfil_id;
    -- Llegó hasta acá: nada lo referencia. La excepción deshace el borrado.
    raise exception 'ensayo' using errcode = 'GR001';
  exception
    when foreign_key_violation then
      return true;
    when sqlstate 'GR001' then
      return false;
  end;
end;
$$;

revoke execute on function public.perfil_tiene_historial(uuid) from public, anon;
grant execute on function public.perfil_tiene_historial(uuid) to authenticated;
