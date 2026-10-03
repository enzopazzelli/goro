-- ============================================================================
-- Ciclo del balde (Fase 9): se termina y se canjea, o se vende entero.
-- ============================================================================
--   cerrado → abierto → vacio → canjeado     (el envase vuelve al proveedor: gratis)
--   cerrado → vendido                         (el envase se va con el cliente: hay que reponerlo)
--
-- Las dos puertas cuestan distinto, y de eso sale el margen real: vender un
-- balde entero deja menos de lo que parece, porque al helado hay que sumarle el
-- envase perdido.
--
-- Todas las transiciones nuevas pasan por funciones. `authenticated` solo puede
-- abrir un balde (la política de Inventario); nadie puede poner `vendido`,
-- `vacio` o `canjeado` con un update directo.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- El precio de un balde entero: un valor del comercio que cada sabor puede
-- pisar, el mismo patrón que el stock mínimo. Sin precio no se vende entero:
-- mejor frenar la venta que cobrar un número que nadie eligió.
-- ----------------------------------------------------------------------------
alter table public.config_comercio
  add column precio_balde_default integer,
  add constraint precio_balde_default_positivo check (precio_balde_default is null or precio_balde_default > 0);

alter table public.sabores
  add column precio_balde integer,
  add constraint precio_balde_positivo check (precio_balde is null or precio_balde > 0);

-- ----------------------------------------------------------------------------
-- Cuándo salió un balde del circuito. Un balde que ya no está (vendido, vacío o
-- canjeado) tiene fecha de salida, y uno que sigue acá no. Es lo que usa el
-- Panel para contar los baldes de un período.
-- ----------------------------------------------------------------------------
update public.baldes set salio_en = coalesce(salio_en, now())
  where estado in ('vendido', 'vacio', 'canjeado');

alter table public.baldes
  add constraint salio_si_ya_no_esta
  check ((estado in ('vendido', 'vacio', 'canjeado')) = (salio_en is not null));

-- ----------------------------------------------------------------------------
-- Un item de venta puede ser un balde entero. El check pasa de "formato o
-- presentación" a "exactamente uno de los tres".
-- ----------------------------------------------------------------------------
alter table public.venta_items
  add column balde_id integer references public.baldes (id);

alter table public.venta_items drop constraint item_es_formato_o_presentacion;
alter table public.venta_items
  add constraint item_es_formato_presentacion_o_balde
  check (num_nonnulls(formato_id, presentacion_id, balde_id) = 1);

-- anular_venta y el costo de los envases buscan por acá.
create index venta_items_balde_idx on public.venta_items (balde_id) where balde_id is not null;

-- ----------------------------------------------------------------------------
-- Vende un balde entero del sabor pedido. Elige el cerrado más viejo (el que
-- lleva más tiempo en la cámara) y no uno cualquiera. `skip locked` es lo que
-- hace que dos ventas simultáneas no peleen por el mismo: la segunda toma otro
-- o, si no hay, avisa que no queda ninguno.
--
-- El helado sale por el ledger como cualquier otra venta (un movimiento
-- negativo por todo lo que quedaba), así los kilos y su costo aparecen en el
-- Panel sin un caso especial.
-- ----------------------------------------------------------------------------
create function public.cobrar_item_balde(p_venta_id integer, p_item jsonb)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_nombre text;
  v_precio integer;
  v_balde_id integer;
  v_kg numeric;
  v_item_id integer;
  v_sabor_id integer := (p_item->>'balde_sabor_id')::integer;
begin
  select s.nombre, coalesce(s.precio_balde, c.precio_balde_default)
    into v_nombre, v_precio
    from public.sabores s cross join public.config_comercio c
    where s.id = v_sabor_id and s.activo;
  if not found then
    raise exception 'Sabor inválido o inactivo.';
  end if;
  if v_precio is null then
    raise exception 'Falta ponerle precio al balde entero de %.', v_nombre
      using hint = 'sin_precio_balde';
  end if;

  select id, kg_restante into v_balde_id, v_kg
    from public.baldes
    where sabor_id = v_sabor_id and estado = 'cerrado'
    order by entro_en, id
    limit 1
    for update skip locked;
  if v_balde_id is null then
    raise exception 'No hay un balde cerrado de %.', v_nombre using hint = 'sin_balde_cerrado';
  end if;

  insert into public.venta_items (venta_id, balde_id, precio)
  values (p_venta_id, v_balde_id, v_precio)
  returning id into v_item_id;

  if v_kg > 0 then
    perform public.aplicar_movimiento_balde(v_balde_id, 'venta', -v_kg, v_item_id);
  end if;

  update public.baldes set estado = 'vendido', salio_en = now() where id = v_balde_id;

  return v_precio;
end;
$$;

revoke execute on function public.cobrar_item_balde(integer, jsonb)
  from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- registrar_venta: ahora un item puede ser un formato, un producto o un balde
-- entero. Mantiene la clave de idempotencia y la caja de las versiones
-- anteriores.
-- ----------------------------------------------------------------------------
create or replace function public.registrar_venta(
  p_items jsonb,
  p_medio_pago public.medio_pago,
  p_clave uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_turno_id integer;
  v_venta_id integer;
  v_creador uuid;
  v_total integer := 0;
  v_item jsonb;
begin
  if not coalesce(public.auth_rol() is not null, false) then
    raise exception 'Sin sesión activa';
  end if;

  if p_clave is not null then
    select id, creado_por into v_venta_id, v_creador
      from public.ventas where clave_idempotencia = p_clave;
    if found then
      if v_creador is distinct from auth.uid() then
        raise exception 'Clave de cobro inválida.';
      end if;
      return v_venta_id;
    end if;
  end if;

  select id into v_turno_id from public.turnos_caja where cerrado_en is null for share;
  if v_turno_id is null then
    raise exception 'La caja está cerrada.' using hint = 'caja_cerrada';
  end if;

  if jsonb_array_length(p_items) = 0 then
    raise exception 'La venta no tiene items.';
  end if;

  insert into public.ventas (medio_pago, total, creado_por, turno_id, clave_idempotencia)
  values (p_medio_pago, 0, auth.uid(), v_turno_id, p_clave)
  on conflict (clave_idempotencia) where clave_idempotencia is not null do nothing
  returning id into v_venta_id;

  if v_venta_id is null then
    select id into v_venta_id from public.ventas where clave_idempotencia = p_clave;
    return v_venta_id;
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    if num_nonnulls(v_item->>'formato_id', v_item->>'presentacion_id', v_item->>'balde_sabor_id') <> 1 then
      raise exception 'Cada item tiene que ser un formato, un producto o un balde.';
    end if;

    if v_item->>'presentacion_id' is not null then
      v_total := v_total + public.cobrar_item_presentacion(v_venta_id, v_item);
    elsif v_item->>'balde_sabor_id' is not null then
      v_total := v_total + public.cobrar_item_balde(v_venta_id, v_item);
    else
      v_total := v_total + public.cobrar_item_formato(v_venta_id, v_item);
    end if;
  end loop;

  update public.ventas set total = v_total where id = v_venta_id;

  if p_medio_pago = 'efectivo' and v_total > 0 then
    insert into public.movimientos_caja (turno_id, tipo, monto, venta_id, creado_por)
    values (v_turno_id, 'venta', v_total, v_venta_id, auth.uid());
  end if;

  return v_venta_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- anular_venta: igual que antes (con el permiso), y un balde vendido entero
-- vuelve a la cámara. Los kilos los devuelve el ledger, como en cualquier
-- anulación; acá solo se repone su estado.
-- ----------------------------------------------------------------------------
create or replace function public.anular_venta(p_venta_id integer)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_estado public.estado_venta;
  v_medio_pago public.medio_pago;
  v_total integer;
  v_turno_id integer;
  v_movimiento record;
begin
  if not coalesce(public.auth_rol() is not null, false) then
    raise exception 'Sin sesión activa';
  end if;
  if not public.tiene_permiso('anular_ventas') then
    raise exception 'No tenés permiso para anular ventas.';
  end if;

  select estado, medio_pago, total into v_estado, v_medio_pago, v_total
    from public.ventas where id = p_venta_id for update;
  if v_estado is null then
    raise exception 'Venta inexistente.';
  end if;
  if v_estado <> 'cobrada' then
    raise exception 'Esa venta ya está anulada.';
  end if;

  if v_medio_pago = 'efectivo' and v_total > 0 then
    select id into v_turno_id from public.turnos_caja where cerrado_en is null for share;
    if v_turno_id is null then
      raise exception 'Para anular una venta en efectivo tiene que haber una caja abierta: la plata sale del cajón.'
        using hint = 'caja_cerrada';
    end if;

    insert into public.movimientos_caja (turno_id, tipo, monto, venta_id, creado_por)
    values (v_turno_id, 'anulacion', -v_total, p_venta_id, auth.uid());
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

  update public.baldes set estado = 'cerrado', salio_en = null
    where estado = 'vendido'
      and id in (select balde_id from public.venta_items
                 where venta_id = p_venta_id and balde_id is not null);

  update public.ventas
    set estado = 'anulada', anulado_por = auth.uid(), anulado_en = now()
    where id = p_venta_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- corregir_sabor_venta_item: igual que antes, y un balde entero no tiene
-- sabores que corregir (es EL balde, no una elección del cliente).
-- ----------------------------------------------------------------------------
create or replace function public.corregir_sabor_venta_item(
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
  if not public.tiene_permiso('anular_ventas') then
    raise exception 'No tenés permiso para corregir ventas.';
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

  if exists (select 1 from public.venta_items where id = p_venta_item_id and balde_id is not null) then
    raise exception 'Un balde entero no tiene sabores para corregir: si se equivocaron de balde, anulen la venta.';
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

-- ----------------------------------------------------------------------------
-- Se terminó el balde abierto. Lo que el sistema creía que quedaba (casi nunca
-- es cero: la venta descuenta una estimación) se da de baja con un ajuste, para
-- que el ledger siga cerrando. Cualquiera con sesión puede: es lo que se hace
-- cada vez que un balde se acaba en el mostrador, y no hay que trabar eso con
-- un permiso. Lo que queda registrado es quién lo hizo.
-- ----------------------------------------------------------------------------
create function public.vaciar_balde(p_balde_id integer)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_estado public.estado_balde;
  v_kg numeric;
begin
  if not coalesce(public.auth_rol() is not null, false) then
    raise exception 'Sin sesión activa';
  end if;

  select estado, kg_restante into v_estado, v_kg
    from public.baldes where id = p_balde_id for update;
  if v_estado is null then
    raise exception 'Balde inexistente.';
  end if;
  if v_estado <> 'abierto' then
    raise exception 'Solo se puede dar por terminado un balde abierto.';
  end if;

  if v_kg > 0 then
    perform public.aplicar_movimiento_balde(p_balde_id, 'ajuste', -v_kg, null);
  end if;

  update public.baldes set estado = 'vacio', salio_en = now() where id = p_balde_id;
end;
$$;

revoke execute on function public.vaciar_balde(integer) from public, anon;
grant execute on function public.vaciar_balde(integer) to authenticated;

-- ----------------------------------------------------------------------------
-- Se entregaron vacíos al proveedor a cambio de baldes llenos (que entran por
-- el alta de siempre). Acepta varios porque se entregan de a tandas, y es todo
-- o nada: si alguno ya no estaba vacío, no se canjea ninguno y se dice cuál.
-- ----------------------------------------------------------------------------
create function public.canjear_baldes(p_ids integer[])
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_pedidos integer := coalesce(cardinality(p_ids), 0);
  v_canjeados integer;
begin
  if not coalesce(public.auth_rol() is not null, false) then
    raise exception 'Sin sesión activa';
  end if;
  if not public.tiene_permiso('cargar_inventario') then
    raise exception 'No tenés permiso para canjear baldes.';
  end if;
  if v_pedidos = 0 then
    raise exception 'Elegí al menos un balde.';
  end if;

  update public.baldes set estado = 'canjeado'
    where id = any (p_ids) and estado = 'vacio';
  get diagnostics v_canjeados = row_count;

  if v_canjeados <> v_pedidos then
    raise exception 'Alguno de esos baldes ya no está vacío. Actualizá la pantalla.';
  end if;

  return v_canjeados;
end;
$$;

revoke execute on function public.canjear_baldes(integer[]) from public, anon;
grant execute on function public.canjear_baldes(integer[]) to authenticated;

-- ----------------------------------------------------------------------------
-- Panel: el costo de lo vendido suma, aparte, los envases de los baldes que se
-- vendieron enteros (se fueron con el cliente y hay que reponerlos). Cambia el
-- tipo que devuelve, así que se reemplaza entera.
-- ----------------------------------------------------------------------------
drop function public.costo_de_lo_vendido(timestamptz, timestamptz);

create function public.costo_de_lo_vendido(p_desde timestamptz, p_hasta timestamptz)
returns table (costo_helado numeric, costo_insumos numeric, costo_envases numeric)
language sql
stable
set search_path = public, pg_temp
as $$
  select
    coalesce((
      select sum((0 - mb.kg) * (b.costo::numeric / b.kg_inicial))
      from public.movimientos_balde mb
      join public.venta_items vi on vi.id = mb.venta_item_id
      join public.ventas v on v.id = vi.venta_id
      join public.baldes b on b.id = mb.balde_id
      where v.estado = 'cobrada' and v.creado_en >= p_desde and v.creado_en < p_hasta
    ), 0),
    coalesce((
      select sum((0 - mi.cantidad) * mi.costo_unitario)
      from public.movimientos_insumo mi
      join public.venta_items vi on vi.id = mi.venta_item_id
      join public.ventas v on v.id = vi.venta_id
      where v.estado = 'cobrada' and v.creado_en >= p_desde and v.creado_en < p_hasta
    ), 0),
    coalesce((
      select sum(b.costo_envase)
      from public.venta_items vi
      join public.ventas v on v.id = vi.venta_id
      join public.baldes b on b.id = vi.balde_id
      where v.estado = 'cobrada' and v.creado_en >= p_desde and v.creado_en < p_hasta
    ), 0);
$$;

revoke execute on function public.costo_de_lo_vendido(timestamptz, timestamptz) from public, anon;
grant execute on function public.costo_de_lo_vendido(timestamptz, timestamptz) to authenticated;

-- ----------------------------------------------------------------------------
-- Panel: el ranking de artículos agrupa los baldes enteros por sabor ("Balde
-- entero · Frutilla"), no por cada balde físico.
-- ----------------------------------------------------------------------------
drop function public.unidades_por_articulo(timestamptz, timestamptz);

create function public.unidades_por_articulo(p_desde timestamptz, p_hasta timestamptz)
returns table (
  formato_nombre text,
  presentacion_nombre text,
  presentacion_unidades integer,
  insumo_nombre text,
  balde_sabor_nombre text,
  unidades integer,
  total integer
)
language sql
stable
set search_path = public, pg_temp
as $$
  select f.nombre, p.nombre, p.unidades, i.nombre, bs.nombre, count(*)::integer, sum(vi.precio)::integer
  from public.venta_items vi
  join public.ventas v on v.id = vi.venta_id
  left join public.formatos f on f.id = vi.formato_id
  left join public.presentaciones_insumo p on p.id = vi.presentacion_id
  left join public.insumos i on i.id = p.insumo_id
  left join public.baldes b on b.id = vi.balde_id
  left join public.sabores bs on bs.id = b.sabor_id
  where v.estado = 'cobrada' and v.creado_en >= p_desde and v.creado_en < p_hasta
  group by vi.formato_id, vi.presentacion_id, bs.id, f.nombre, p.nombre, p.unidades, i.nombre, bs.nombre
  order by 6 desc, 7 desc;
$$;

revoke execute on function public.unidades_por_articulo(timestamptz, timestamptz)
  from public, anon;
grant execute on function public.unidades_por_articulo(timestamptz, timestamptz) to authenticated;

-- ----------------------------------------------------------------------------
-- Panel: cuántos baldes salieron del circuito en el período y por qué puerta.
-- `costo_envase` es lo que cuesta reponer el envase: solo pesa en los vendidos,
-- pero se devuelve para todos para que la pantalla muestre lo que se ahorró en
-- los que volvieron al proveedor.
-- ----------------------------------------------------------------------------
create function public.baldes_del_periodo(p_desde timestamptz, p_hasta timestamptz)
returns table (estado public.estado_balde, cantidad integer, costo_envase integer)
language sql
stable
set search_path = public, pg_temp
as $$
  select b.estado, count(*)::integer, coalesce(sum(b.costo_envase), 0)::integer
  from public.baldes b
  where b.estado in ('vendido', 'vacio', 'canjeado')
    and b.salio_en >= p_desde and b.salio_en < p_hasta
  group by b.estado
  order by b.estado;
$$;

revoke execute on function public.baldes_del_periodo(timestamptz, timestamptz) from public, anon;
grant execute on function public.baldes_del_periodo(timestamptz, timestamptz) to authenticated;
