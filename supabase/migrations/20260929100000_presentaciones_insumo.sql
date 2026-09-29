-- ============================================================================
-- Presentaciones de un insumo: "Unidad", "Docena", cada una con su precio.
-- ============================================================================
-- Un insumo se puede vender suelto si tiene alguna presentación activa. El
-- precio por docena es un precio por mayor, no 12 × la unidad, por eso vive
-- en la presentación y no en el insumo.
--
-- Sin `delete` para authenticated: una presentación con ventas encima no
-- se borra, se desactiva (mismo criterio que los formatos). El `check`
-- activa_con_precio es la regla "se carga inactiva hasta que Goro le pone
-- precio" dentro de la base: ninguna pantalla puede dejar algo a la venta a $0.
-- ============================================================================
create table public.presentaciones_insumo (
  id         integer generated always as identity primary key,
  insumo_id  integer not null references public.insumos (id),
  nombre     text not null,
  unidades   integer not null,
  precio     integer not null default 0,
  activo     boolean not null default false,
  creado_en  timestamptz not null default now(),
  constraint nombre_no_vacio check (length(trim(nombre)) > 0),
  constraint unidades_positivas check (unidades > 0),
  constraint precio_no_negativo check (precio >= 0),
  constraint activa_con_precio check (not activo or precio > 0)
);

-- "Solo puede haber una x12 por insumo": índice, no un select previo.
create unique index presentaciones_insumo_una_por_tamano
  on public.presentaciones_insumo (insumo_id, unidades);

alter table public.presentaciones_insumo enable row level security;
grant select, insert on public.presentaciones_insumo to authenticated;
grant update (nombre, unidades, precio, activo) on public.presentaciones_insumo to authenticated;
revoke all on public.presentaciones_insumo from anon;
revoke delete on public.presentaciones_insumo from authenticated;

create policy "presentaciones_insumo: cualquier sesion activa lee"
  on public.presentaciones_insumo for select to authenticated
  using (public.auth_rol() is not null);

create policy "presentaciones_insumo: solo el dueño da de alta"
  on public.presentaciones_insumo for insert to authenticated
  with check (public.es_duenio());

create policy "presentaciones_insumo: solo el dueño edita"
  on public.presentaciones_insumo for update to authenticated
  using (public.es_duenio())
  with check (public.es_duenio());
