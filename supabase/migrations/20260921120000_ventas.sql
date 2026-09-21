-- ============================================================================
-- Ventas: cobrar formatos a dedo, sin escaneo (recorte de Fase 4).
-- ============================================================================
-- Mismo criterio que las migraciones anteriores: RLS activa desde la
-- creación, grant explícito a authenticated, revoke de anon. Las tres
-- tablas nuevas quedan de solo lectura para authenticated — la única
-- puerta de escritura son las funciones de abajo.
-- ============================================================================

create type public.medio_pago as enum ('efectivo', 'tarjeta', 'transferencia');
create type public.estado_venta as enum ('cobrada', 'anulada');

create table public.ventas (
  id           integer generated always as identity primary key,
  medio_pago   public.medio_pago not null,
  total        integer not null,
  estado       public.estado_venta not null default 'cobrada',
  creado_por   uuid not null references public.perfiles (id),
  creado_en    timestamptz not null default now(),
  anulado_por  uuid references public.perfiles (id),
  anulado_en   timestamptz,
  constraint total_no_negativo check (total >= 0)
);

alter table public.ventas enable row level security;
grant select on public.ventas to authenticated;
revoke all on public.ventas from anon;

create policy "ventas: cualquier sesion activa lee"
  on public.ventas for select to authenticated
  using (public.auth_rol() is not null);

create table public.venta_items (
  id          integer generated always as identity primary key,
  venta_id    integer not null references public.ventas (id),
  formato_id  integer not null references public.formatos (id),
  precio      integer not null,
  constraint precio_no_negativo check (precio >= 0)
);

alter table public.venta_items enable row level security;
grant select on public.venta_items to authenticated;
revoke all on public.venta_items from anon;

create policy "venta_items: cualquier sesion activa lee"
  on public.venta_items for select to authenticated
  using (public.auth_rol() is not null);

-- Ledger de baldes: mismo criterio que movimientos_insumo, nunca se pisa
-- kg_restante con un número absoluto. `venta_item_id` es nulo para los
-- ajustes de fin de día, que no vienen de ningún ticket.
create type public.tipo_movimiento_balde as enum
  ('venta', 'anulacion', 'correccion', 'ajuste');

create table public.movimientos_balde (
  id            integer generated always as identity primary key,
  balde_id      integer not null references public.baldes (id),
  venta_item_id integer references public.venta_items (id),
  tipo          public.tipo_movimiento_balde not null,
  kg            numeric not null,
  creado_por    uuid not null references public.perfiles (id),
  creado_en     timestamptz not null default now(),
  constraint kg_no_cero check (kg <> 0)
);

alter table public.movimientos_balde enable row level security;
grant select on public.movimientos_balde to authenticated;
revoke all on public.movimientos_balde from anon;

create policy "movimientos_balde: cualquier sesion activa lee"
  on public.movimientos_balde for select to authenticated
  using (public.auth_rol() is not null);

-- ----------------------------------------------------------------------------
-- La única función que escribe de verdad. Sin `grant execute` a
-- `authenticated`: solo la llaman las cuatro funciones de abajo, desde
-- adentro. Esto es lo que impide que alguien dispare un movimiento 'venta'
-- sin pasar por registrar_venta, o un 'anulacion' sin pasar por anular_venta.
-- ----------------------------------------------------------------------------
create function public.aplicar_movimiento_balde(
  p_balde_id integer,
  p_tipo public.tipo_movimiento_balde,
  p_kg numeric,
  p_venta_item_id integer
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.movimientos_balde (balde_id, venta_item_id, tipo, kg, creado_por)
  values (p_balde_id, p_venta_item_id, p_tipo, p_kg, auth.uid());

  update public.baldes set kg_restante = kg_restante + p_kg where id = p_balde_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- Arma el ticket completo: uno o más items, cada uno con su formato y los
-- sabores elegidos (hasta el cupo del formato, nunca repetidos). Precio y
-- gramos se leen del servidor, nunca del cliente.
-- ----------------------------------------------------------------------------
create function public.registrar_venta(
  p_items jsonb,
  p_medio_pago public.medio_pago
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_venta_id integer;
  v_total integer := 0;
  v_item jsonb;
  v_formato public.formatos%rowtype;
  v_sabor_nombre text;
  v_sabor_ids integer[];
  v_cantidad_sabores integer;
  v_kg numeric;
  v_sabor_id integer;
  v_balde_id integer;
  v_item_id integer;
begin
  if not coalesce(public.auth_rol() is not null, false) then
    raise exception 'Sin sesión activa';
  end if;

  if jsonb_array_length(p_items) = 0 then
    raise exception 'La venta no tiene items.';
  end if;

  insert into public.ventas (medio_pago, total, creado_por)
  values (p_medio_pago, 0, auth.uid())
  returning id into v_venta_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_formato from public.formatos
      where id = (v_item->>'formato_id')::integer and activo
      for update;
    if not found then
      raise exception 'Formato inválido o inactivo.';
    end if;

    select array_agg(distinct value::integer) into v_sabor_ids
      from jsonb_array_elements_text(v_item->'sabor_ids');
    v_cantidad_sabores := coalesce(array_length(v_sabor_ids, 1), 0);

    if v_cantidad_sabores < 1 or v_cantidad_sabores > v_formato.cantidad_sabores then
      raise exception 'Elegí entre 1 y % sabores para %.', v_formato.cantidad_sabores, v_formato.nombre;
    end if;

    insert into public.venta_items (venta_id, formato_id, precio)
    values (v_venta_id, v_formato.id, v_formato.precio)
    returning id into v_item_id;

    v_total := v_total + v_formato.precio;
    v_kg := (v_formato.gramos::numeric / v_cantidad_sabores) / 1000.0;

    foreach v_sabor_id in array v_sabor_ids
    loop
      select nombre into v_sabor_nombre from public.sabores where id = v_sabor_id and activo;
      if not found then
        raise exception 'Sabor inválido o inactivo.';
      end if;

      select id into v_balde_id from public.baldes
        where sabor_id = v_sabor_id and estado = 'abierto';
      if v_balde_id is null then
        raise exception 'No hay un balde abierto de %.', v_sabor_nombre
          using detail = v_sabor_id::text, hint = 'sin_balde_abierto';
      end if;

      perform public.aplicar_movimiento_balde(v_balde_id, 'venta', -v_kg, v_item_id);
    end loop;
  end loop;

  update public.ventas set total = v_total where id = v_venta_id;

  return v_venta_id;
end;
$$;

grant execute on function public.registrar_venta to authenticated;

-- ----------------------------------------------------------------------------
-- Anula una venta cobrada: agrupa los movimientos por balde y revierte el
-- neto de cada uno (una corrección de sabor previa puede haber dejado más
-- de una fila por balde).
-- ----------------------------------------------------------------------------
create function public.anular_venta(p_venta_id integer)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_estado public.estado_venta;
  v_movimiento record;
begin
  if not coalesce(public.auth_rol() is not null, false) then
    raise exception 'Sin sesión activa';
  end if;

  select estado into v_estado from public.ventas where id = p_venta_id for update;
  if v_estado is null then
    raise exception 'Venta inexistente.';
  end if;
  if v_estado <> 'cobrada' then
    raise exception 'Esa venta ya está anulada.';
  end if;

  for v_movimiento in
    select mb.balde_id, sum(mb.kg) as kg_neto
    from public.movimientos_balde mb
    join public.venta_items vi on vi.id = mb.venta_item_id
    where vi.venta_id = p_venta_id
    group by mb.balde_id
    having sum(mb.kg) <> 0
  loop
    perform public.aplicar_movimiento_balde(v_movimiento.balde_id, 'anulacion', -v_movimiento.kg_neto, null);
  end loop;

  update public.ventas
    set estado = 'anulada', anulado_por = auth.uid(), anulado_en = now()
    where id = p_venta_id;
end;
$$;

grant execute on function public.anular_venta to authenticated;

-- ----------------------------------------------------------------------------
-- El cliente pidió frutilla y chocolate, cambió chocolate por vainilla
-- antes de irse. Busca el balde EXACTO que se debitó para ese item y ese
-- sabor viejo (no "el balde abierto" en genérico, puede haber cambiado), le
-- devuelve el kg neto, y se lo saca al balde abierto del sabor nuevo.
-- ----------------------------------------------------------------------------
create function public.corregir_sabor_venta_item(
  p_venta_item_id integer,
  p_sabor_viejo_id integer,
  p_sabor_nuevo_id integer
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_estado public.estado_venta;
  v_balde_viejo_id integer;
  v_kg numeric;
  v_balde_nuevo_id integer;
begin
  if not coalesce(public.auth_rol() is not null, false) then
    raise exception 'Sin sesión activa';
  end if;
  if p_sabor_viejo_id = p_sabor_nuevo_id then
    raise exception 'Elegí un sabor distinto.';
  end if;

  select v.estado into v_estado
    from public.venta_items vi join public.ventas v on v.id = vi.venta_id
    where vi.id = p_venta_item_id;
  if v_estado is distinct from 'cobrada' then
    raise exception 'Solo se puede corregir una venta cobrada.';
  end if;

  select mb.balde_id, sum(mb.kg) into v_balde_viejo_id, v_kg
    from public.movimientos_balde mb
    join public.baldes b on b.id = mb.balde_id
    where mb.venta_item_id = p_venta_item_id and b.sabor_id = p_sabor_viejo_id
    group by mb.balde_id;
  if v_balde_viejo_id is null or v_kg >= 0 then
    raise exception 'Ese sabor no está cargado en este item.';
  end if;

  select id into v_balde_nuevo_id from public.baldes
    where sabor_id = p_sabor_nuevo_id and estado = 'abierto';
  if v_balde_nuevo_id is null then
    raise exception 'No hay un balde abierto de ese sabor.'
      using detail = p_sabor_nuevo_id::text, hint = 'sin_balde_abierto';
  end if;

  perform public.aplicar_movimiento_balde(v_balde_viejo_id, 'correccion', -v_kg, p_venta_item_id);
  perform public.aplicar_movimiento_balde(v_balde_nuevo_id, 'correccion', v_kg, p_venta_item_id);
end;
$$;

grant execute on function public.corregir_sabor_venta_item to authenticated;

-- ----------------------------------------------------------------------------
-- Corrección de fin de día: la estimación de registrar_venta puede no
-- coincidir con lo que realmente queda en el balde. Vive conceptualmente
-- junto a Baldes, no junto a Ventas, aunque la necesidad haya salido de acá.
-- ----------------------------------------------------------------------------
create function public.registrar_ajuste_balde(
  p_balde_id integer,
  p_kg numeric
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not coalesce(public.auth_rol() is not null, false) then
    raise exception 'Sin sesión activa';
  end if;
  if p_kg = 0 then
    raise exception 'El ajuste no puede ser cero.';
  end if;

  perform public.aplicar_movimiento_balde(p_balde_id, 'ajuste', p_kg, null);
end;
$$;

grant execute on function public.registrar_ajuste_balde to authenticated;
