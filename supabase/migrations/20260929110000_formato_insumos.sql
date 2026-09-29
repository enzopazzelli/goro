-- ============================================================================
-- Qué insumos consume un formato al venderse con helado.
-- ============================================================================
-- "Cucurucho doble" consume 1 "Cono doble". Un formato sin filas no consume
-- nada (el vasito simple). Se descuenta desde registrar_venta, no desde acá.
--
-- Diferencias con presentaciones_insumo, a propósito:
--  * formato_id lleva `on delete cascade`: esto es configuración, no
--    historial (lo vendido queda en movimientos_insumo). Sin el cascade, el
--    botón "Borrar formato" fallaría con un mensaje engañoso.
--  * el dueño puede borrar filas (quitar un consumo).
--  * el `update` cubre las tres columnas porque el upsert de PostgREST
--    reescribe todas las que envía; es solo del dueño, así que no abre nada.
-- ============================================================================
create table public.formato_insumos (
  formato_id  integer not null references public.formatos (id) on delete cascade,
  insumo_id   integer not null references public.insumos (id),
  cantidad    integer not null,
  primary key (formato_id, insumo_id),
  constraint cantidad_positiva check (cantidad > 0)
);

alter table public.formato_insumos enable row level security;
grant select, insert, delete on public.formato_insumos to authenticated;
grant update (formato_id, insumo_id, cantidad) on public.formato_insumos to authenticated;
revoke all on public.formato_insumos from anon;

create policy "formato_insumos: cualquier sesion activa lee"
  on public.formato_insumos for select to authenticated
  using (public.auth_rol() is not null);

create policy "formato_insumos: solo el dueño da de alta"
  on public.formato_insumos for insert to authenticated
  with check (public.es_duenio());

create policy "formato_insumos: solo el dueño edita"
  on public.formato_insumos for update to authenticated
  using (public.es_duenio())
  with check (public.es_duenio());

create policy "formato_insumos: solo el dueño borra"
  on public.formato_insumos for delete to authenticated
  using (public.es_duenio());
