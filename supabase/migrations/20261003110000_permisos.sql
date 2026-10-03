-- ============================================================================
-- Permisos por acción (Fase 8): qué puede hacer cada colaborador.
-- ============================================================================
-- El dueño puede todo. A un colaborador se le dan o se le sacan tres permisos,
-- desde la pantalla de Usuarios. No hay un editor de roles: son pocas
-- acciones, las que mueven plata o stock, y una lista fija se entiende de un
-- vistazo y no se puede configurar mal.
--
--   anular_ventas      anular una venta y corregir el sabor de un ticket
--   movimientos_caja   registrar ingresos, gastos y retiros, y anularlos
--   cargar_inventario  dar de alta baldes, cargar mercadería y hacer ajustes
--
-- Abrir un balde NO está en la lista: sin eso no se puede seguir vendiendo.
--
-- Hoy cualquiera con sesión puede hacer las tres cosas, así que el default es
-- tenerlas todas: aplicar esta migración no le saca nada a nadie. El dueño
-- quita lo que quiera, persona por persona.
-- ============================================================================

alter table public.perfiles
  add column permisos text[] not null
    default array['anular_ventas', 'movimientos_caja', 'cargar_inventario'],
  -- La validación vive también acá (Regla 4): un permiso mal escrito en la
  -- lista se rechaza en la base, no solo en el formulario.
  add constraint permisos_conocidos
    check (permisos <@ array['anular_ventas', 'movimientos_caja', 'cargar_inventario']);

-- Solo el dueño edita perfiles (política de Núcleo), así que un colaborador no
-- puede darse permisos a sí mismo.
grant update (nombre, rol, activo, permisos) on public.perfiles to authenticated;

-- ----------------------------------------------------------------------------
-- ¿Puede quien pide hacer esto? El dueño siempre; un colaborador, si lo tiene en
-- su lista. El `coalesce` es el de siempre: sin sesión, o con el usuario
-- desactivado, la subconsulta no devuelve nada y la respuesta es "no". Nunca
-- NULL, así que un `if not tiene_permiso(...)` dispara la excepción.
-- ----------------------------------------------------------------------------
create function public.tiene_permiso(p_permiso text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select rol = 'duenio' or p_permiso = any (permisos)
       from public.perfiles
       where id = auth.uid() and activo),
    false
  );
$$;

revoke execute on function public.tiene_permiso(text) from public, anon;
grant execute on function public.tiene_permiso(text) to authenticated;

-- ----------------------------------------------------------------------------
-- anular_ventas
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

  update public.ventas
    set estado = 'anulada', anulado_por = auth.uid(), anulado_en = now()
    where id = p_venta_id;
end;
$$;

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
-- movimientos_caja
-- ----------------------------------------------------------------------------
create or replace function public.registrar_movimiento_caja(
  p_tipo public.tipo_movimiento_caja,
  p_monto integer,
  p_detalle text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_turno_id integer;
begin
  if not coalesce(public.auth_rol() is not null, false) then
    raise exception 'Sin sesión activa';
  end if;
  if not public.tiene_permiso('movimientos_caja') then
    raise exception 'No tenés permiso para registrar gastos, ingresos o retiros.';
  end if;
  if p_tipo is null or p_tipo not in ('ingreso', 'gasto', 'retiro') then
    raise exception 'Tipo de movimiento inválido: solo ingreso, gasto o retiro.';
  end if;
  if p_monto is null or p_monto <= 0 then
    raise exception 'El monto tiene que ser mayor a cero.';
  end if;
  if length(trim(coalesce(p_detalle, ''))) = 0 then
    raise exception 'Falta el detalle.';
  end if;

  select id into v_turno_id from public.turnos_caja where cerrado_en is null for share;
  if v_turno_id is null then
    raise exception 'La caja está cerrada.' using hint = 'caja_cerrada';
  end if;

  insert into public.movimientos_caja (turno_id, tipo, monto, detalle, creado_por)
  values (
    v_turno_id,
    p_tipo,
    case when p_tipo = 'ingreso' then p_monto else -p_monto end,
    trim(p_detalle),
    auth.uid()
  );
end;
$$;

create or replace function public.anular_movimiento_caja(p_movimiento_id integer)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_turno_abierto integer;
  v_turno_movimiento integer;
  v_tipo public.tipo_movimiento_caja;
  v_anulado_en timestamptz;
begin
  if not coalesce(public.auth_rol() is not null, false) then
    raise exception 'Sin sesión activa';
  end if;
  if not public.tiene_permiso('movimientos_caja') then
    raise exception 'No tenés permiso para anular movimientos de caja.';
  end if;

  select id into v_turno_abierto from public.turnos_caja where cerrado_en is null for share;

  select turno_id, tipo, anulado_en into v_turno_movimiento, v_tipo, v_anulado_en
    from public.movimientos_caja where id = p_movimiento_id for update;
  if not found then
    raise exception 'Movimiento inexistente.';
  end if;
  if v_tipo not in ('ingreso', 'gasto', 'retiro') then
    raise exception 'Solo se anulan ingresos, gastos y retiros.';
  end if;
  if v_turno_movimiento is distinct from v_turno_abierto then
    raise exception 'Solo se pueden anular movimientos de la caja abierta.';
  end if;
  if v_anulado_en is not null then
    raise exception 'Ese movimiento ya está anulado.';
  end if;

  update public.movimientos_caja
    set anulado_por = auth.uid(), anulado_en = now()
    where id = p_movimiento_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- cargar_inventario
-- ----------------------------------------------------------------------------
create or replace function public.registrar_ajuste_balde(
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
  if not public.tiene_permiso('cargar_inventario') then
    raise exception 'No tenés permiso para ajustar el stock.';
  end if;
  if p_kg = 0 then
    raise exception 'El ajuste no puede ser cero.';
  end if;

  perform public.aplicar_movimiento_balde(p_balde_id, 'ajuste', p_kg, null);
end;
$$;

create or replace function public.registrar_movimiento_insumo(
  p_insumo_id integer,
  p_tipo public.tipo_movimiento_insumo,
  p_cantidad numeric,
  p_motivo text
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
  if not public.tiene_permiso('cargar_inventario') then
    raise exception 'No tenés permiso para cargar ni ajustar el stock.';
  end if;

  if p_tipo not in ('entrada', 'ajuste') then
    raise exception 'Tipo de movimiento inválido: solo entrada o ajuste.';
  end if;

  perform public.aplicar_movimiento_insumo(p_insumo_id, p_tipo, p_cantidad, null, p_motivo);
end;
$$;

-- Dar de alta un balde pasa por una política y no por una función: el permiso
-- entra ahí, junto a las condiciones que ya tenía.
drop policy "baldes: cualquier sesion activa da de alta" on public.baldes;

create policy "baldes: quien puede cargar inventario da de alta"
  on public.baldes for insert to authenticated
  with check (
    public.tiene_permiso('cargar_inventario')
    and estado = 'cerrado'
    and kg_restante = kg_inicial
  );
