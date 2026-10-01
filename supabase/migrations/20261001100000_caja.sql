-- ============================================================================
-- Caja: turnos del local, libro de efectivo y arqueo ciego (Fase 5).
-- ============================================================================
-- El turno es del LOCAL, no de la persona: hay un solo cajón. Si Ana abre y
-- Lucas cierra, es el mismo turno (prompt-base-web.md §4).
--
-- Mismo criterio que las migraciones anteriores: RLS activa desde la
-- creación, grant explícito a authenticated, revoke de anon. Las tres tablas
-- quedan de solo lectura: la única puerta de escritura son las funciones de
-- abajo, y registrar_venta / anular_venta se reemplazan para que escriban en
-- la caja dentro de su misma transacción (Regla 1).
-- ============================================================================

create table public.turnos_caja (
  id           integer generated always as identity primary key,
  abierto_por  uuid not null references public.perfiles (id),
  abierto_en   timestamptz not null default now(),
  cerrado_por  uuid references public.perfiles (id),
  cerrado_en   timestamptz,
  constraint cierre_completo check ((cerrado_por is null) = (cerrado_en is null))
);

-- "Una sola caja abierta" es un índice, no un select previo (Regla 3). La
-- regla 1.3 del método salió exactamente de acá: dos clics rápidos abrían dos
-- turnos y descuadraban el arqueo.
create unique index un_turno_abierto
  on public.turnos_caja ((cerrado_en is null))
  where cerrado_en is null;

alter table public.turnos_caja enable row level security;
grant select on public.turnos_caja to authenticated;
revoke all on public.turnos_caja from anon;

create policy "turnos_caja: cualquier sesion activa lee"
  on public.turnos_caja for select to authenticated
  using (public.auth_rol() is not null);

-- ----------------------------------------------------------------------------
-- El libro de caja: cada peso que entra o sale del cajón es una fila, y "cuánto
-- debería haber" es la suma de las no anuladas. La apertura también es un
-- movimiento, así esa suma no tiene casos especiales.
-- ----------------------------------------------------------------------------
create type public.tipo_movimiento_caja as enum
  ('apertura', 'venta', 'anulacion', 'ingreso', 'gasto', 'retiro');

create table public.movimientos_caja (
  id           integer generated always as identity primary key,
  turno_id     integer not null references public.turnos_caja (id),
  tipo         public.tipo_movimiento_caja not null,
  monto        integer not null,  -- con signo: entra +, sale −
  detalle      text,
  venta_id     integer references public.ventas (id),
  creado_por   uuid not null references public.perfiles (id),
  creado_en    timestamptz not null default now(),
  anulado_por  uuid references public.perfiles (id),
  anulado_en   timestamptz,
  constraint signo_segun_tipo check (
    case tipo
      when 'apertura' then monto >= 0
      when 'venta' then monto > 0
      when 'ingreso' then monto > 0
      else monto < 0
    end
  ),
  constraint detalle_solo_a_mano check ((tipo in ('ingreso', 'gasto', 'retiro')) = (detalle is not null)),
  constraint detalle_no_vacio check (length(trim(detalle)) > 0),
  constraint venta_solo_en_cobros check ((tipo in ('venta', 'anulacion')) = (venta_id is not null)),
  constraint anula_solo_lo_manual check (anulado_en is null or tipo in ('ingreso', 'gasto', 'retiro')),
  constraint anulacion_completa check ((anulado_por is null) = (anulado_en is null))
);

create index movimientos_caja_turno_idx on public.movimientos_caja (turno_id);

create unique index una_apertura_por_turno
  on public.movimientos_caja (turno_id) where tipo = 'apertura';
create unique index un_cobro_por_venta
  on public.movimientos_caja (venta_id) where tipo = 'venta';
create unique index una_devolucion_por_venta
  on public.movimientos_caja (venta_id) where tipo = 'anulacion';

alter table public.movimientos_caja enable row level security;
grant select on public.movimientos_caja to authenticated;
revoke all on public.movimientos_caja from anon;

create policy "movimientos_caja: cualquier sesion activa lee"
  on public.movimientos_caja for select to authenticated
  using (public.auth_rol() is not null);

-- ----------------------------------------------------------------------------
-- Arqueo CIEGO: el esperado y la diferencia viven acá, y acá solo lee el
-- dueño. Si quien cuenta sabe cuánto tiene que dar, "cuenta" hasta llegar.
-- Límite honesto: el colaborador ve las ventas del turno (las necesita para
-- atender) y sumando a mano podría deducirlo; lo que no hace el sistema es
-- servírselo.
-- ----------------------------------------------------------------------------
create table public.arqueos (
  turno_id         integer primary key references public.turnos_caja (id),
  esperado         integer not null,  -- congelado al cerrar
  contado          integer not null,
  diferencia       integer generated always as (contado - esperado) stored,
  fondo_que_queda  integer not null,  -- lo que se deja en el cajón; el resto se lo lleva Goro
  constraint contado_no_negativo check (contado >= 0),
  constraint fondo_dentro_de_lo_contado check (fondo_que_queda between 0 and contado)
);

alter table public.arqueos enable row level security;
grant select on public.arqueos to authenticated;
revoke all on public.arqueos from anon;

create policy "arqueos: solo el dueño lee"
  on public.arqueos for select to authenticated
  using (public.es_duenio());

-- ----------------------------------------------------------------------------
-- Cada venta pertenece a un turno. La columna admite null solo por las ventas
-- de prueba anteriores a Caja: toda venta nueva lo tiene porque
-- registrar_venta es la única puerta (authenticated no tiene insert sobre
-- ventas). Se descartó un `check (turno_id is not null) not valid`: Postgres
-- lo vuelve a evaluar en cada update, y anular una venta vieja fallaría.
-- ----------------------------------------------------------------------------
alter table public.ventas add column turno_id integer references public.turnos_caja (id);
create index ventas_turno_idx on public.ventas (turno_id);

-- ----------------------------------------------------------------------------
-- Abrir: el turno y su movimiento de apertura. Ciega a propósito: no recibe ni
-- devuelve lo que dejó el cierre anterior; esa comparación la ve el dueño.
-- ----------------------------------------------------------------------------
create function public.abrir_caja(p_contado integer)
returns integer
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
  if p_contado is null or p_contado < 0 then
    raise exception 'El fondo no puede ser negativo.';
  end if;

  -- Dos aperturas simultáneas: la segunda espera en el índice y choca. Se
  -- traduce el choque para que nadie vea "duplicate key".
  begin
    insert into public.turnos_caja (abierto_por) values (auth.uid())
    returning id into v_turno_id;
  exception when unique_violation then
    raise exception 'Ya hay una caja abierta.';
  end;

  insert into public.movimientos_caja (turno_id, tipo, monto, creado_por)
  values (v_turno_id, 'apertura', p_contado, auth.uid());

  return v_turno_id;
end;
$$;

revoke execute on function public.abrir_caja(integer) from public, anon;
grant execute on function public.abrir_caja(integer) to authenticated;

-- ----------------------------------------------------------------------------
-- Ingresos, gastos y retiros a mano. El monto llega positivo y el signo lo
-- pone la función: el navegador no decide si la plata entra o sale.
-- ----------------------------------------------------------------------------
create function public.registrar_movimiento_caja(
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

revoke execute on function public.registrar_movimiento_caja(public.tipo_movimiento_caja, integer, text)
  from public, anon;
grant execute on function public.registrar_movimiento_caja(public.tipo_movimiento_caja, integer, text)
  to authenticated;

-- ----------------------------------------------------------------------------
-- Un gasto mal tipeado se anula mientras su turno sigue abierto: queda
-- tachado, no se borra. Un turno cerrado ya tiene su arqueo congelado y no se
-- toca. Ventas y anulaciones de venta se manejan desde la venta.
-- ----------------------------------------------------------------------------
create function public.anular_movimiento_caja(p_movimiento_id integer)
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

revoke execute on function public.anular_movimiento_caja(integer) from public, anon;
grant execute on function public.anular_movimiento_caja(integer) to authenticated;

-- ----------------------------------------------------------------------------
-- Cerrar: congela el esperado, guarda el arqueo y cierra. NO devuelve nada:
-- eso es lo que lo hace ciego para quien cierra.
--
-- El `for update` sobre el turno espera a las ventas en curso (que lo tienen
-- `for share`), y una venta que llega después lo ve cerrado y falla. Ninguna
-- venta queda afuera del esperado que se congela acá.
-- ----------------------------------------------------------------------------
create function public.cerrar_caja(p_contado integer, p_fondo_que_queda integer)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_turno_id integer;
  v_esperado integer;
begin
  if not coalesce(public.auth_rol() is not null, false) then
    raise exception 'Sin sesión activa';
  end if;
  if p_contado is null or p_contado < 0 then
    raise exception 'Lo contado no puede ser negativo.';
  end if;
  if p_fondo_que_queda is null or p_fondo_que_queda < 0 then
    raise exception 'El fondo que queda no puede ser negativo.';
  end if;
  if p_fondo_que_queda > p_contado then
    raise exception 'El fondo que queda no puede ser más de lo que contaste.';
  end if;

  select id into v_turno_id from public.turnos_caja where cerrado_en is null for update;
  if v_turno_id is null then
    raise exception 'La caja ya está cerrada.' using hint = 'caja_cerrada';
  end if;

  select coalesce(sum(monto), 0) into v_esperado
    from public.movimientos_caja
    where turno_id = v_turno_id and anulado_en is null;

  insert into public.arqueos (turno_id, esperado, contado, fondo_que_queda)
  values (v_turno_id, v_esperado, p_contado, p_fondo_que_queda);

  update public.turnos_caja
    set cerrado_por = auth.uid(), cerrado_en = now()
    where id = v_turno_id;
end;
$$;

revoke execute on function public.cerrar_caja(integer, integer) from public, anon;
grant execute on function public.cerrar_caja(integer, integer) to authenticated;

-- ----------------------------------------------------------------------------
-- registrar_venta, ahora atada a la caja. Igual que antes, más tres cosas: sin
-- turno abierto no se cobra (hint 'caja_cerrada', la pantalla ofrece abrirla
-- sin perder el carrito), la venta guarda su turno, y si es en efectivo entra
-- al libro de caja. Un ticket de $0 no mueve el cajón: el check de signo lo
-- rechazaría, y hoy un formato se puede activar a $0.
-- `create or replace` conserva los grants de la migración de ventas.
-- ----------------------------------------------------------------------------
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
  v_turno_id integer;
  v_venta_id integer;
  v_total integer := 0;
  v_item jsonb;
  v_es_formato boolean;
  v_es_producto boolean;
begin
  if not coalesce(public.auth_rol() is not null, false) then
    raise exception 'Sin sesión activa';
  end if;

  -- Primero el turno: `for share` deja cobrar en paralelo pero hace esperar a
  -- un cierre de caja hasta que esta venta termine.
  select id into v_turno_id from public.turnos_caja where cerrado_en is null for share;
  if v_turno_id is null then
    raise exception 'La caja está cerrada.' using hint = 'caja_cerrada';
  end if;

  if jsonb_array_length(p_items) = 0 then
    raise exception 'La venta no tiene items.';
  end if;

  insert into public.ventas (medio_pago, total, creado_por, turno_id)
  values (p_medio_pago, 0, auth.uid(), v_turno_id)
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

  if p_medio_pago = 'efectivo' and v_total > 0 then
    insert into public.movimientos_caja (turno_id, tipo, monto, venta_id, creado_por)
    values (v_turno_id, 'venta', v_total, v_venta_id, auth.uid());
  end if;

  return v_venta_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- anular_venta, ahora atada a la caja. Si la venta fue en efectivo, la plata
-- sale del cajón de HOY: el movimiento va al turno abierto ahora, aunque la
-- venta sea de un turno anterior. Sin caja abierta no hay de dónde sacarla, así
-- que no se anula. Tarjeta y transferencia no tocan el cajón y se anulan igual.
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
