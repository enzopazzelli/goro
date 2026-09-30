-- ============================================================================
-- Productos: lo que se vende por unidad o por docena, sin sabor.
-- ============================================================================
-- Tres cosas conviven acá:
--   * bombón, palito, sándwich… (insumos de tipo 'producto'),
--   * el envase de cada formato (cono, canasta, vasito) que también se vende
--     suelto: "sin helado" es vender ese envase con su propio precio,
--   * las presentaciones de ambos: "Unidad" (×1) y "Docena" (×12), cada una
--     con SU precio. El precio por docena es un precio por mayor, no 12 × la
--     unidad, por eso vive en la presentación y no en el insumo.
--
-- El costo de UNA unidad vive en insumos.costo; el precio de venta, acá. Están
-- separados a propósito para que el precio no termine cargado como costo.
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
  -- "Se carga inactiva hasta que Goro le pone precio", dentro de la base:
  -- ninguna pantalla puede dejar algo a la venta a $0.
  constraint activa_con_precio check (not activo or precio > 0)
);

-- "Solo puede haber una ×12 por insumo": índice, no un select previo.
create unique index presentaciones_insumo_una_por_tamano
  on public.presentaciones_insumo (insumo_id, unidades);

-- Sin `delete`: una presentación con ventas encima no se borra, se desactiva
-- (mismo criterio que los formatos).
alter table public.presentaciones_insumo enable row level security;
grant select, insert on public.presentaciones_insumo to authenticated;
grant update (nombre, unidades, precio, activo) on public.presentaciones_insumo to authenticated;
revoke all on public.presentaciones_insumo from anon;

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

-- ----------------------------------------------------------------------------
-- Crea un artículo con su código y sus dos presentaciones (Unidad ×1 y
-- Docena ×12), inactivas y a $0 hasta que Goro les ponga precio. Interna: la
-- llaman crear_producto y crear_envase_de_formato, que son las que revisan el
-- rol. Alta de insumo + código + presentaciones = una sola transacción.
-- ----------------------------------------------------------------------------
create function public.crear_articulo(
  p_nombre text,
  p_tipo public.tipo_insumo,
  p_costo integer,
  p_formato_id integer default null
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id integer;
begin
  insert into public.insumos (nombre, codigo, unidad, minimo, costo, tipo, formato_id)
  values (
    trim(p_nombre),
    public.codigo_articulo(public.siguiente_numero_insumo()),
    'u', 0, p_costo, p_tipo, p_formato_id
  )
  returning id into v_id;

  insert into public.presentaciones_insumo (insumo_id, nombre, unidades)
  values (v_id, 'Unidad', 1), (v_id, 'Docena', 12);

  return v_id;
end;
$$;

revoke execute on function public.crear_articulo(text, public.tipo_insumo, integer, integer)
  from public, anon, authenticated;

-- Un producto de freezer nuevo, con su stock inicial (si hay) como una entrada
-- del ledger: el stock nunca se escribe directo.
create function public.crear_producto(
  p_nombre text,
  p_costo integer,
  p_cantidad_inicial numeric default 0
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id integer;
begin
  if not public.es_duenio() then
    raise exception 'Solo el dueño puede crear productos.';
  end if;
  if p_cantidad_inicial < 0 then
    raise exception 'La cantidad inicial no puede ser negativa.';
  end if;

  v_id := public.crear_articulo(p_nombre, 'producto', p_costo);

  if p_cantidad_inicial > 0 then
    perform public.aplicar_movimiento_insumo(v_id, 'entrada', p_cantidad_inicial, null, 'Carga inicial');
  end if;

  return v_id;
end;
$$;

revoke execute on function public.crear_producto(text, integer, numeric) from public, anon;
grant execute on function public.crear_producto(text, integer, numeric) to authenticated;

-- El envase propio de un formato: el stock de sus conos (o canastas, o
-- vasitos), que se descuenta solo al vender el formato con helado y que
-- también se vende suelto ("sin helado"). Un formato tiene a lo sumo uno: lo
-- garantiza el índice único de insumos.formato_id, no este chequeo previo, que
-- solo existe para dar un mensaje legible.
create function public.crear_envase_de_formato(p_formato_id integer)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_nombre text;
begin
  if not public.es_duenio() then
    raise exception 'Solo el dueño puede crear el envase de un formato.';
  end if;

  select nombre into v_nombre from public.formatos where id = p_formato_id;
  if v_nombre is null then
    raise exception 'Formato inexistente.';
  end if;

  if exists (select 1 from public.insumos where formato_id = p_formato_id) then
    raise exception 'Ese formato ya tiene envase.';
  end if;

  return public.crear_articulo(v_nombre || ' (sin helado)', 'envase', 0, p_formato_id);
end;
$$;

revoke execute on function public.crear_envase_de_formato(integer) from public, anon;
grant execute on function public.crear_envase_de_formato(integer) to authenticated;
