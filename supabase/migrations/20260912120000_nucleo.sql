-- ============================================================================
-- Núcleo: quién entra y qué puede hacer.
-- ============================================================================
-- Una sola heladería, así que no hay columna de sucursal en ningún lado.
--
-- El proyecto tiene "Automatically expose new tables" APAGADO: una tabla
-- nueva no la ve la API hasta que se le da el `grant` explícito. Por eso cada
-- tabla de acá en adelante lleva las cuatro cosas juntas: enable RLS, grant a
-- authenticated, revoke a anon, y políticas.
-- ============================================================================

create type public.rol as enum ('duenio', 'mostrador');

-- Acá se entra con usuario y contraseña, nunca con un correo: en el mostrador
-- nadie tiene ni quiere una casilla. Supabase Auth exige igual un email para
-- crear la cuenta, así que el front le arma uno interno
-- (`ana` → `ana@heladeria.local`, ver src/modulos/auth/usuario.ts). Ese correo
-- no existe y no se muestra nunca.
--
-- El usuario visible se guarda acá como columna propia en vez de deducirlo
-- recortándole el dominio al correo: así el correo sintético queda como un
-- detalle de Auth y no se filtra a ninguna pantalla.
create table public.perfiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  usuario    text not null unique,
  nombre     text not null,
  rol        public.rol not null default 'mostrador',
  activo     boolean not null default true,
  creado_en  timestamptz not null default now(),

  -- Las validaciones viven también acá y no solo en el formulario: el
  -- formulario es comodidad de UX, esto es lo que no se puede saltear
  -- pegándole a la API. La forma es la misma que normalizarUsuario().
  constraint nombre_no_vacio check (length(trim(nombre)) > 0),
  constraint usuario_bien_formado check (usuario ~ '^[a-z0-9._-]{3,32}$')
);

alter table public.perfiles enable row level security;

grant select, insert, update on public.perfiles to authenticated;
-- Sin lectura pública: acá no hay nada que mostrarle a quien no inició sesión.
revoke all on public.perfiles from anon;
-- No se borra un usuario, se desactiva: sus ventas tienen que seguir
-- atribuidas a alguien el día que se revisa un turno viejo.
revoke delete on public.perfiles from authenticated;

-- ----------------------------------------------------------------------------
-- Rol de quien está pidiendo. `security definer` para poder leer perfiles sin
-- entrar en recursión con las políticas de la propia tabla.
-- Devuelve NULL si no hay sesión o si el usuario está desactivado.
-- ----------------------------------------------------------------------------
create or replace function public.auth_rol()
returns public.rol
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select rol from public.perfiles where id = auth.uid() and activo;
$$;

-- ----------------------------------------------------------------------------
-- El `coalesce` no es decorativo: `auth_rol()` devuelve NULL sin sesión, y
-- `null = 'duenio'` es NULL. En una política RLS un NULL bloquea la fila, pero
-- en un `if` de PL/pgSQL `if not (null or false)` NO dispara la excepción — así
-- es como en el proyecto anterior cualquiera sin login podía borrar un
-- producto. Toda comparación de rol pasa por acá.
-- ----------------------------------------------------------------------------
create or replace function public.es_duenio()
returns boolean
language sql
stable
as $$
  select coalesce(public.auth_rol() = 'duenio', false);
$$;

-- ----------------------------------------------------------------------------
-- Políticas. Cada uno se ve a sí mismo; el dueño ve y administra a todos.
-- ----------------------------------------------------------------------------
create policy "perfiles: cada uno se ve, el dueño ve a todos"
  on public.perfiles for select to authenticated
  using (id = auth.uid() or public.es_duenio());

create policy "perfiles: solo el dueño da de alta"
  on public.perfiles for insert to authenticated
  with check (public.es_duenio());

create policy "perfiles: solo el dueño edita"
  on public.perfiles for update to authenticated
  using (public.es_duenio())
  with check (public.es_duenio());

-- ----------------------------------------------------------------------------
-- Alta automática del perfil cuando nace el usuario en auth.users.
--
-- El `usuario` sale de la parte local del correo interno, que es justamente de
-- donde vino: `ana@heladeria.local` → `ana`.
--
-- El rol SIEMPRE arranca en 'mostrador', nunca se lee de los metadatos que
-- manda el cliente: si se leyera de ahí, cualquiera que pueda registrarse se
-- haría dueño mandando {"rol":"duenio"} en el alta. Promover a dueño es una
-- acción del dueño, desde la pantalla de usuarios.
-- ----------------------------------------------------------------------------
create or replace function public.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_usuario text := split_part(new.email, '@', 1);
begin
  insert into public.perfiles (id, usuario, nombre)
  values (
    new.id,
    v_usuario,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nombre'), ''), v_usuario)
  );
  return new;
end;
$$;

create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil();
