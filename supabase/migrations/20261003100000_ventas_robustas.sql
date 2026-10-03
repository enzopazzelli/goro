-- ============================================================================
-- Dos arreglos a Ventas: el doble cobro y el costo que se movía hacia atrás.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Un cobro no se registra dos veces.
--
-- Dos clics muy rápidos en Cobrar, o un reintento después de perder la
-- respuesta, mandaban el mismo ticket dos veces y entraban dos ventas. La
-- pantalla le pone a cada ticket una clave al azar y la manda con él;
-- `registrar_venta` devuelve la venta que ya tiene esa clave en vez de crear
-- otra. La clave cambia con cada cambio del carrito, así que la misma clave
-- siempre significa el mismo ticket.
--
-- La unicidad es un índice (Regla 3), no un `select` previo: dos pedidos
-- simultáneos con la misma clave pasan los dos ese chequeo. Es parcial porque
-- las ventas viejas, y las que lleguen sin clave, no la tienen.
-- ----------------------------------------------------------------------------
alter table public.ventas add column clave_idempotencia uuid;

create unique index una_venta_por_clave
  on public.ventas (clave_idempotencia)
  where clave_idempotencia is not null;

-- Con la clave como tercer parámetro la firma cambia, y dejar la anterior
-- haría ambiguas las llamadas que no la mandan. `p_clave` tiene default null,
-- así que esas llamadas siguen andando igual.
drop function public.registrar_venta(jsonb, public.medio_pago);

create function public.registrar_venta(
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
  v_es_formato boolean;
  v_es_producto boolean;
begin
  if not coalesce(public.auth_rol() is not null, false) then
    raise exception 'Sin sesión activa';
  end if;

  -- Antes que nada, incluso antes de mirar la caja: si la venta de esta clave
  -- ya entró, un reintento tiene que decir "ya está", no "la caja se cerró".
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

  -- `for share` deja cobrar en paralelo pero hace esperar a un cierre de caja
  -- hasta que esta venta termine.
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

  -- Perdió la carrera: otra transacción con la misma clave ya confirmó su
  -- venta. Se devuelve esa y no se cobra nada.
  if v_venta_id is null then
    select id into v_venta_id from public.ventas where clave_idempotencia = p_clave;
    return v_venta_id;
  end if;

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

  if p_medio_pago = 'efectivo' and v_total > 0 then
    insert into public.movimientos_caja (turno_id, tipo, monto, venta_id, creado_por)
    values (v_turno_id, 'venta', v_total, v_venta_id, auth.uid());
  end if;

  return v_venta_id;
end;
$$;

revoke execute on function public.registrar_venta(jsonb, public.medio_pago, uuid) from public, anon;
grant execute on function public.registrar_venta(jsonb, public.medio_pago, uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 2. El costo de un insumo queda congelado en el movimiento.
--
-- El margen del Panel valuaba los insumos vendidos al `insumos.costo` de HOY:
-- si Goro subía el precio de los cucuruchos, el margen de las ventas de marzo
-- cambiaba hacia atrás. El helado no tenía ese problema (sale al costo de su
-- balde); los insumos sí. Es la misma regla que ya vale para el precio de
-- venta: lo que se cobró, y lo que costó, se escribe cuando pasa.
-- ----------------------------------------------------------------------------
alter table public.movimientos_insumo add column costo_unitario integer;

-- Las filas que ya existen no tienen otro dato que el costo actual: es lo más
-- cerca que se puede estar de lo que valían entonces.
update public.movimientos_insumo mi
  set costo_unitario = i.costo
  from public.insumos i
  where i.id = mi.insumo_id;

alter table public.movimientos_insumo
  alter column costo_unitario set not null,
  add constraint costo_unitario_no_negativo check (costo_unitario >= 0);

-- `create or replace` conserva el revoke de la migración de Inventario: sigue
-- cerrada a todos los roles.
create or replace function public.aplicar_movimiento_insumo(
  p_insumo_id integer,
  p_tipo public.tipo_movimiento_insumo,
  p_cantidad numeric,
  p_venta_item_id integer,
  p_motivo text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_costo integer;
begin
  select costo into v_costo from public.insumos where id = p_insumo_id for update;

  insert into public.movimientos_insumo
    (insumo_id, venta_item_id, tipo, cantidad, costo_unitario, motivo, creado_por)
  values (p_insumo_id, p_venta_item_id, p_tipo, p_cantidad, v_costo, p_motivo, auth.uid());

  update public.insumos set cantidad = cantidad + p_cantidad where id = p_insumo_id;
end;
$$;

-- Ahora el costo de los insumos vendidos sale del movimiento, no del insumo.
create or replace function public.costo_de_lo_vendido(p_desde timestamptz, p_hasta timestamptz)
returns table (costo_helado numeric, costo_insumos numeric)
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
    ), 0);
$$;
