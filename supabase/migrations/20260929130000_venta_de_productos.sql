-- ============================================================================
-- Vender productos por unidad y descontar el cono de cada formato.
-- ============================================================================
-- registrar_venta se parte en dos funciones internas (cobrar_item_formato y
-- cobrar_item_presentacion) para no crecer más allá de lo legible. Todo sigue
-- dentro de UNA transacción: si cualquier ítem falla, no queda ninguna venta.
--
-- El stock de un insumo puede quedar negativo a propósito (decisión de
-- Goro): con el cliente esperando, lo que está mal es el conteo, no la venta.
-- ============================================================================

alter table public.movimientos_insumo
  add column venta_item_id integer references public.venta_items (id);

alter table public.venta_items
  alter column formato_id drop not null,
  add column presentacion_id integer references public.presentaciones_insumo (id),
  add constraint item_es_formato_o_presentacion
    check ((formato_id is null) <> (presentacion_id is null));

-- La única función que escribe movimientos de insumo ligados a una venta.
-- Sin grant: solo la llaman las funciones de abajo.
create function public.aplicar_movimiento_insumo(
  p_insumo_id integer,
  p_tipo public.tipo_movimiento_insumo,
  p_cantidad numeric,
  p_venta_item_id integer
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.movimientos_insumo (insumo_id, venta_item_id, tipo, cantidad, creado_por)
  values (p_insumo_id, p_venta_item_id, p_tipo, p_cantidad, auth.uid());

  update public.insumos set cantidad = cantidad + p_cantidad where id = p_insumo_id;
end;
$$;

revoke execute on function public.aplicar_movimiento_insumo(integer, public.tipo_movimiento_insumo, numeric, integer)
  from public, anon, authenticated;

-- Un item de tipo formato: helado de los baldes abiertos + los insumos que
-- consume el formato (su cono). Devuelve el precio cobrado.
create function public.cobrar_item_formato(p_venta_id integer, p_item jsonb)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_formato public.formatos%rowtype;
  v_sabor_nombre text;
  v_sabor_ids integer[];
  v_cantidad_sabores integer;
  v_kg numeric;
  v_sabor_id integer;
  v_balde_id integer;
  v_item_id integer;
  v_consumo record;
begin
  select * into v_formato from public.formatos
    where id = (p_item->>'formato_id')::integer and activo
    for update;
  if not found then
    raise exception 'Formato inválido o inactivo.';
  end if;

  select array_agg(distinct value::integer) into v_sabor_ids
    from jsonb_array_elements_text(p_item->'sabor_ids');
  v_cantidad_sabores := coalesce(array_length(v_sabor_ids, 1), 0);

  if v_cantidad_sabores < 1 or v_cantidad_sabores > v_formato.cantidad_sabores then
    raise exception 'Elegí entre 1 y % sabores para %.', v_formato.cantidad_sabores, v_formato.nombre;
  end if;

  insert into public.venta_items (venta_id, formato_id, precio)
  values (p_venta_id, v_formato.id, v_formato.precio)
  returning id into v_item_id;

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

  -- No se mira si el insumo está activo ni si alcanza el stock: no se frena
  -- una venta por un conteo.
  for v_consumo in
    select insumo_id, cantidad from public.formato_insumos where formato_id = v_formato.id
  loop
    perform public.aplicar_movimiento_insumo(v_consumo.insumo_id, 'venta', -v_consumo.cantidad, v_item_id);
  end loop;

  return v_formato.precio;
end;
$$;

revoke execute on function public.cobrar_item_formato(integer, jsonb)
  from public, anon, authenticated;

-- Un item de tipo producto: una presentación (unidad, docena) de un insumo.
create function public.cobrar_item_presentacion(p_venta_id integer, p_item jsonb)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_presentacion public.presentaciones_insumo%rowtype;
  v_item_id integer;
begin
  select * into v_presentacion from public.presentaciones_insumo
    where id = (p_item->>'presentacion_id')::integer and activo
    for update;
  if not found then
    raise exception 'Producto inválido o inactivo.';
  end if;

  perform 1 from public.insumos where id = v_presentacion.insumo_id and activo;
  if not found then
    raise exception 'Producto inválido o inactivo.';
  end if;

  insert into public.venta_items (venta_id, presentacion_id, precio)
  values (p_venta_id, v_presentacion.id, v_presentacion.precio)
  returning id into v_item_id;

  perform public.aplicar_movimiento_insumo(v_presentacion.insumo_id, 'venta', -v_presentacion.unidades, v_item_id);

  return v_presentacion.precio;
end;
$$;

revoke execute on function public.cobrar_item_presentacion(integer, jsonb)
  from public, anon, authenticated;

-- Arma el ticket: cada item es un formato (con sabores) o un producto.
create or replace function public.registrar_venta(
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
  v_es_formato boolean;
  v_es_producto boolean;
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
    v_es_formato := v_item->>'formato_id' is not null;
    v_es_producto := v_item->>'presentacion_id' is not null;

    if v_es_formato = v_es_producto then
      raise exception 'Cada item tiene que ser un formato o un producto.';
    end if;

    if v_es_producto then
      v_total := v_total + public.cobrar_item_presentacion(v_venta_id, v_item);
    else
      v_total := v_total + public.cobrar_item_formato(v_venta_id, v_item);
    end if;
  end loop;

  update public.ventas set total = v_total where id = v_venta_id;

  return v_venta_id;
end;
$$;

-- Anula una venta cobrada: revierte el neto de cada balde y de cada insumo.
create or replace function public.anular_venta(p_venta_id integer)
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

  for v_movimiento in
    select mi.insumo_id, sum(mi.cantidad) as cantidad_neta
    from public.movimientos_insumo mi
    join public.venta_items vi on vi.id = mi.venta_item_id
    where vi.venta_id = p_venta_id
    group by mi.insumo_id
    having sum(mi.cantidad) <> 0
  loop
    perform public.aplicar_movimiento_insumo(v_movimiento.insumo_id, 'anulacion', -v_movimiento.cantidad_neta, null);
  end loop;

  update public.ventas
    set estado = 'anulada', anulado_por = auth.uid(), anulado_en = now()
    where id = p_venta_id;
end;
$$;
