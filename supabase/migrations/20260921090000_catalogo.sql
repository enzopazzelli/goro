-- ============================================================================
-- Catálogo: formatos (cucurucho, vasito, 1/4, 1/2, kilo...).
-- ============================================================================
-- Mismo criterio que las migraciones anteriores: RLS activa desde la
-- creación, grant explícito a authenticated, revoke de anon.
--
-- A diferencia de `sabores`/`insumos`, acá SÍ se otorga `delete`: un formato
-- creado por error tiene que poder desaparecer. No hace falta proteger el
-- borrado de un formato con ventas encima "a mano" — el día que Fase 4
-- agregue `formato_id integer not null references public.formatos (id)` en
-- la línea de venta, esa foreign key (sin `on delete cascade`) va a
-- rechazar sola cualquier intento de borrar un formato ya usado. `activo`
-- pasa a ser el único camino para retirarlo recién en ese momento.
-- ============================================================================
create table public.formatos (
  id                integer generated always as identity primary key,
  nombre            text not null unique,
  gramos            integer not null,
  cantidad_sabores  integer not null,
  precio            integer not null,
  activo            boolean not null default true,
  creado_en         timestamptz not null default now(),
  constraint nombre_no_vacio check (length(trim(nombre)) > 0),
  constraint gramos_positivo check (gramos > 0),
  constraint cantidad_sabores_positiva check (cantidad_sabores >= 1),
  constraint precio_no_negativo check (precio >= 0)
);

alter table public.formatos enable row level security;
grant select, insert, delete on public.formatos to authenticated;
grant update (nombre, gramos, cantidad_sabores, precio, activo) on public.formatos to authenticated;
revoke all on public.formatos from anon;

create policy "formatos: cualquier sesion activa lee"
  on public.formatos for select to authenticated
  using (public.auth_rol() is not null);

create policy "formatos: solo el dueño da de alta"
  on public.formatos for insert to authenticated
  with check (public.es_duenio());

create policy "formatos: solo el dueño edita"
  on public.formatos for update to authenticated
  using (public.es_duenio())
  with check (public.es_duenio());

create policy "formatos: solo el dueño borra"
  on public.formatos for delete to authenticated
  using (public.es_duenio());
