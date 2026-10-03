-- ============================================================================
-- Potes armados y lector de códigos (Fase 3 / 4).
-- ============================================================================
-- Un pote armado es un objeto físico con identidad propia: tiene su código, su
-- peso REAL (el que marcó la balanza, no el nombre del formato) y su precio
-- congelado al armarlo. El código no lleva datos adentro: todo vive acá.
--
-- Armar un pote saca el helado del balde abierto en ese momento (un movimiento
-- del ledger, nunca un número pisado). Venderlo no toca stock: ya salió.
--
-- El pote es de UN balde (UN sabor). Un formato de varios sabores se sigue
-- cobrando como hasta ahora, a mano, en Ventas.
-- ============================================================================

-- Un tipo nuevo de movimiento para el ledger de baldes. Las funciones que lo
-- usan van en plpgsql (se evalúan al ejecutarse): las que son `language sql`
-- no lo nombran, porque en la misma transacción que el `add value` un valor
-- nuevo todavía no se puede usar.
alter type public.tipo_movimiento_balde add value if not exists 'armado';

alter table public.movimientos_balde add column pote_id integer;
-- (la foreign key se agrega abajo, cuando existe la tabla de potes)

-- ----------------------------------------------------------------------------
-- aplicar_movimiento_balde ahora puede ligar el movimiento a un pote. El
-- parámetro nuevo tiene default, así que las llamadas de siempre (cuatro
-- argumentos) siguen andando. Sigue cerrada a todos los roles.
-- ----------------------------------------------------------------------------
drop function public.aplicar_movimiento_balde(integer, public.tipo_movimiento_balde, numeric, integer);

create function public.aplicar_movimiento_balde(
  p_balde_id integer,
  p_tipo public.tipo_movimiento_balde,
  p_kg numeric,
  p_venta_item_id integer,
  p_pote_id integer default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.movimientos_balde (balde_id, venta_item_id, pote_id, tipo, kg, creado_por)
  values (p_balde_id, p_venta_item_id, p_pote_id, p_tipo, p_kg, auth.uid());

  update public.baldes set kg_restante = kg_restante + p_kg where id = p_balde_id;
end;
$$;

revoke execute on function
  public.aplicar_movimiento_balde(integer, public.tipo_movimiento_balde, numeric, integer, integer)
  from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- Código de POTE (tipo P). Es el mismo cálculo que `codigo_articulo`, con el
-- peso del tipo P (2) en el dígito verificador: `generarCodigo("P", n)` de
-- src/lib/codigos/codigo.ts tiene que dar lo mismo, y un test los compara.
-- ----------------------------------------------------------------------------
create sequence public.potes_secuencia;
revoke all on sequence public.potes_secuencia from anon, authenticated;

create function public.siguiente_numero_pote()
returns integer
language sql
security definer
set search_path = public, pg_temp
as $$
  select nextval('public.potes_secuencia')::integer;
$$;

revoke execute on function public.siguiente_numero_pote() from public, anon, authenticated;

create function public.codigo_pote(p_numero integer)
returns text
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  v_secuencia text;
  v_suma integer := 6;  -- el tipo P (peso 2) en la posición 0, que pesa 3
  i integer;
begin
  if p_numero is null or p_numero < 1 or p_numero > 999999 then
    raise exception 'Secuencia fuera de rango (1..999999): %', p_numero;
  end if;

  v_secuencia := lpad(p_numero::text, 6, '0');
  for i in 1..6 loop
    v_suma := v_suma + substr(v_secuencia, i, 1)::integer * case when i % 2 = 1 then 1 else 3 end;
  end loop;

  return 'GP' || v_secuencia || ((10 - v_suma % 10) % 10)::text;
end;
$$;

revoke execute on function public.codigo_pote(integer) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- La tabla de potes. Solo de lectura para authenticated: la única puerta de
-- escritura son las funciones de abajo.
-- ----------------------------------------------------------------------------
create type public.estado_pote as enum ('impreso', 'vendido', 'anulado', 'descartado');

create table public.potes (
  id          integer generated always as identity primary key,
  codigo      text not null unique,
  formato_id  integer not null references public.formatos (id),
  balde_id    integer not null references public.baldes (id),
  -- El peso se MIDE, no se calcula: nunca se guarda 250 porque el formato se
  -- llame "1/4 kilo". Si la balanza dijo 262, se guarda 262.
  peso_g      integer not null,
  -- Congelado al armar: cambiar la lista de precios no toca lo ya impreso.
  precio      integer not null,
  estado      public.estado_pote not null default 'impreso',
  armado_por  uuid not null references public.perfiles (id),
  armado_en   timestamptz not null default now(),
  constraint codigo_de_pote_bien_formado check (codigo ~ '^GP\d{7}$'),
  constraint peso_positivo check (peso_g > 0),
  constraint precio_de_pote_no_negativo check (precio >= 0)
);

create index potes_estado_idx on public.potes (estado);

alter table public.potes enable row level security;
grant select on public.potes to authenticated;
revoke all on public.potes from anon;

create policy "potes: cualquier sesion activa lee"
  on public.potes for select to authenticated
  using (public.auth_rol() is not null);

alter table public.movimientos_balde
  add constraint movimientos_balde_pote_fkey foreign key (pote_id) references public.potes (id);
create index movimientos_balde_pote_idx on public.movimientos_balde (pote_id) where pote_id is not null;

-- ----------------------------------------------------------------------------
-- Un item de venta puede ser un pote. Exactamente uno de los cuatro.
-- ----------------------------------------------------------------------------
alter table public.venta_items add column pote_id integer references public.potes (id);

alter table public.venta_items drop constraint item_es_formato_presentacion_o_balde;
alter table public.venta_items
  add constraint item_es_formato_presentacion_balde_o_pote
  check (num_nonnulls(formato_id, presentacion_id, balde_id, pote_id) = 1);

create index venta_items_pote_idx on public.venta_items (pote_id) where pote_id is not null;

-- ----------------------------------------------------------------------------
-- Armar un pote: lo pesó alguien en la balanza y tipeó el número. Saca el
-- helado del balde ABIERTO (el del mostrador) y devuelve el id del pote, que la
-- pantalla usa para mostrar la etiqueta.
--
-- Dos frenos de sentido común, escritos para mostrarse tal cual: un peso que
-- está lejísimos del formato (un 2620 donde iba 262) y un balde al que no le
-- queda lo que pesa el pote. La venta nunca se frena por un conteo; esto es
-- stock, y un balde "en cero" con helado de sobra se arregla ajustándolo.
-- ----------------------------------------------------------------------------
create function public.armar_pote(p_formato_id integer, p_balde_id integer, p_peso_g integer)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_formato public.formatos%rowtype;
  v_balde record;
  v_kg numeric;
  v_id integer;
begin
  if not coalesce(public.auth_rol() is not null, false) then
    raise exception 'Sin sesión activa';
  end if;
  if p_peso_g is null or p_peso_g <= 0 then
    raise exception 'El peso tiene que ser mayor a cero.';
  end if;

  select * into v_formato from public.formatos where id = p_formato_id and activo;
  if not found then
    raise exception 'Formato inválido o inactivo.';
  end if;
  if p_peso_g < v_formato.gramos * 0.5 or p_peso_g > v_formato.gramos * 1.5 then
    raise exception 'El peso (% g) está muy lejos de lo que lleva %: % g. ¿Lo tipeaste bien?',
      p_peso_g, v_formato.nombre, v_formato.gramos;
  end if;

  select id, estado, kg_restante into v_balde
    from public.baldes where id = p_balde_id for update;
  if v_balde.id is null then
    raise exception 'Balde inexistente.';
  end if;
  if v_balde.estado <> 'abierto' then
    raise exception 'Solo se arman potes con un balde abierto.';
  end if;

  v_kg := p_peso_g / 1000.0;
  if v_balde.kg_restante < v_kg then
    raise exception 'Al balde le quedan % kg y el pote pesa % kg. Reponé o ajustá el balde primero.',
      v_balde.kg_restante, v_kg using hint = 'balde_corto';
  end if;

  insert into public.potes (codigo, formato_id, balde_id, peso_g, precio, armado_por)
  values (
    public.codigo_pote(public.siguiente_numero_pote()),
    v_formato.id, p_balde_id, p_peso_g, v_formato.precio, auth.uid()
  )
  returning id into v_id;

  perform public.aplicar_movimiento_balde(p_balde_id, 'armado', -v_kg, null, v_id);

  return v_id;
end;
$$;

revoke execute on function public.armar_pote(integer, integer, integer) from public, anon;
grant execute on function public.armar_pote(integer, integer, integer) to authenticated;

-- ----------------------------------------------------------------------------
-- Un pote armado por error (se pesó mal, era otro sabor) se anula mientras sigue
-- en el freezer: el helado vuelve al balde. Cualquiera con sesión puede, como
-- el que se equivoca recién lo armó.
-- ----------------------------------------------------------------------------
create function public.anular_pote(p_pote_id integer)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_estado public.estado_pote;
  v_movimiento record;
begin
  if not coalesce(public.auth_rol() is not null, false) then
    raise exception 'Sin sesión activa';
  end if;

  select estado into v_estado from public.potes where id = p_pote_id for update;
  if v_estado is null then
    raise exception 'Pote inexistente.';
  end if;
  if v_estado <> 'impreso' then
    raise exception 'Solo se anula un pote que sigue en el freezer.';
  end if;

  for v_movimiento in
    select balde_id, sum(kg) as kg_neto
    from public.movimientos_balde
    where pote_id = p_pote_id
    group by balde_id
    having sum(kg) <> 0
  loop
    perform public.aplicar_movimiento_balde(v_movimiento.balde_id, 'anulacion', -v_movimiento.kg_neto, null, p_pote_id);
  end loop;

  update public.potes set estado = 'anulado' where id = p_pote_id;
end;
$$;

revoke execute on function public.anular_pote(integer) from public, anon;
grant execute on function public.anular_pote(integer) to authenticated;

-- ----------------------------------------------------------------------------
-- Descartar un pote (se venció, se cayó): es merma, así que el helado NO vuelve
-- al balde, y lo decide quien puede tocar el stock.
-- ----------------------------------------------------------------------------
create function public.descartar_pote(p_pote_id integer)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_estado public.estado_pote;
begin
  if not coalesce(public.auth_rol() is not null, false) then
    raise exception 'Sin sesión activa';
  end if;
  if not public.tiene_permiso('cargar_inventario') then
    raise exception 'No tenés permiso para descartar potes.';
  end if;

  select estado into v_estado from public.potes where id = p_pote_id for update;
  if v_estado is null then
    raise exception 'Pote inexistente.';
  end if;
  if v_estado <> 'impreso' then
    raise exception 'Solo se descarta un pote que sigue en el freezer.';
  end if;

  update public.potes set estado = 'descartado' where id = p_pote_id;
end;
$$;

revoke execute on function public.descartar_pote(integer) from public, anon;
grant execute on function public.descartar_pote(integer) to authenticated;

-- ----------------------------------------------------------------------------
-- Cobrar un pote: el precio es el que se congeló al armarlo. "Un pote no se
-- cobra dos veces" lo garantiza el `for update` con el cambio de estado dentro
-- de la misma transacción: el segundo cobro simultáneo lo ve vendido y avisa.
-- El envase del formato se descuenta acá, como en cualquier formato.
-- ----------------------------------------------------------------------------
create function public.cobrar_item_pote(p_venta_id integer, p_item jsonb)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_pote public.potes%rowtype;
  v_item_id integer;
  v_envase_id integer;
begin
  select * into v_pote from public.potes
    where id = (p_item->>'pote_id')::integer for update;
  if not found then
    raise exception 'Pote inexistente.';
  end if;
  if v_pote.estado <> 'impreso' then
    raise exception 'Ese pote (%) ya no está en el freezer.', v_pote.codigo
      using hint = 'pote_no_disponible';
  end if;

  insert into public.venta_items (venta_id, pote_id, precio)
  values (p_venta_id, v_pote.id, v_pote.precio)
  returning id into v_item_id;

  update public.potes set estado = 'vendido' where id = v_pote.id;

  select id into v_envase_id from public.insumos where formato_id = v_pote.formato_id;
  if v_envase_id is not null then
    perform public.aplicar_movimiento_insumo(v_envase_id, 'venta', -1, v_item_id);
  end if;

  return v_pote.precio;
end;
$$;

revoke execute on function public.cobrar_item_pote(integer, jsonb) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- cobrar_item_balde: ahora puede venderse un balde PUNTUAL (el que se escaneó)
-- además de "el más viejo del sabor".
-- ----------------------------------------------------------------------------
create or replace function public.cobrar_item_balde(p_venta_id integer, p_item jsonb)
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
  v_balde_pedido integer := (p_item->>'balde_id')::integer;
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

  if v_balde_pedido is not null then
    select id, kg_restante into v_balde_id, v_kg
      from public.baldes
      where id = v_balde_pedido and sabor_id = v_sabor_id and estado = 'cerrado'
      for update;
  else
    select id, kg_restante into v_balde_id, v_kg
      from public.baldes
      where sabor_id = v_sabor_id and estado = 'cerrado'
      order by entro_en, id
      limit 1
      for update skip locked;
  end if;
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

-- ----------------------------------------------------------------------------
-- registrar_venta: un item es un formato, un producto, un balde entero o un
-- pote. Mantiene la clave de cobro y la caja.
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
    if num_nonnulls(
         v_item->>'formato_id', v_item->>'presentacion_id',
         v_item->>'balde_sabor_id', v_item->>'pote_id'
       ) <> 1 then
      raise exception 'Cada item tiene que ser un formato, un producto, un balde o un pote.';
    end if;

    if v_item->>'presentacion_id' is not null then
      v_total := v_total + public.cobrar_item_presentacion(v_venta_id, v_item);
    elsif v_item->>'balde_sabor_id' is not null then
      v_total := v_total + public.cobrar_item_balde(v_venta_id, v_item);
    elsif v_item->>'pote_id' is not null then
      v_total := v_total + public.cobrar_item_pote(v_venta_id, v_item);
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
-- anular_venta: un pote vendido vuelve al freezer, y un balde entero a la
-- cámara. Lo demás, igual que antes (con el permiso).
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

  -- El helado del pote ya había salido del balde al armarlo: acá solo vuelve al freezer.
  update public.potes set estado = 'impreso'
    where estado = 'vendido'
      and id in (select pote_id from public.venta_items
                 where venta_id = p_venta_id and pote_id is not null);

  update public.ventas
    set estado = 'anulada', anulado_por = auth.uid(), anulado_en = now()
    where id = p_venta_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- El lector: la pistola manda una cadena y nada más. No sabe, ni tiene que
-- saber, si lo que escaneó es un insumo, un balde o un pote. Toda pantalla que
-- lea códigos pregunta acá; si mañana aparece una cuarta naturaleza de código,
-- se agrega en esta función y no en cuatro pantallas.
--
-- `security invoker` (el default) y `stable`: cada pantalla ve lo que su rol ve.
-- Devuelve cero filas cuando el código no existe.
-- ----------------------------------------------------------------------------
create function public.resolver_codigo(p_texto text)
returns table (tipo text, id integer)
language sql
stable
set search_path = public, pg_temp
as $$
  with buscado as (select upper(trim(p_texto)) as codigo)
  select 'articulo'::text, i.id from public.insumos i, buscado b where i.codigo = b.codigo
  union all
  select 'balde'::text, ba.id from public.baldes ba, buscado b where ba.codigo = b.codigo
  union all
  select 'pote'::text, p.id from public.potes p, buscado b where p.codigo = b.codigo;
$$;

revoke execute on function public.resolver_codigo(text) from public, anon;
grant execute on function public.resolver_codigo(text) to authenticated;

-- ----------------------------------------------------------------------------
-- Panel. Un pote vendido aporta sus kilos (al sabor de su balde) y el costo de
-- ese helado; el helado salió del balde al ARMAR, no al vender, así que se llega
-- a él por el pote y no por el item. Las funciones `sql` no nombran el tipo
-- 'armado': filtran por `pote_id`, que es lo que distingue a esos movimientos.
-- ----------------------------------------------------------------------------
create or replace function public.kilos_por_sabor(p_desde timestamptz, p_hasta timestamptz)
returns table (sabor_id integer, sabor_nombre text, kg numeric)
language sql
stable
set search_path = public, pg_temp
as $$
  select t.sabor_id, s.nombre, (0 - sum(t.kg))::numeric
  from (
    select b.sabor_id, mb.kg
    from public.movimientos_balde mb
    join public.venta_items vi on vi.id = mb.venta_item_id
    join public.ventas v on v.id = vi.venta_id
    join public.baldes b on b.id = mb.balde_id
    where v.estado = 'cobrada' and v.creado_en >= p_desde and v.creado_en < p_hasta
    union all
    select b.sabor_id, mb.kg
    from public.movimientos_balde mb
    join public.venta_items vi on vi.pote_id = mb.pote_id
    join public.ventas v on v.id = vi.venta_id
    join public.baldes b on b.id = mb.balde_id
    where v.estado = 'cobrada' and v.creado_en >= p_desde and v.creado_en < p_hasta
  ) t
  join public.sabores s on s.id = t.sabor_id
  group by t.sabor_id, s.nombre
  having sum(t.kg) < 0
  order by 3 desc, 2;
$$;

create or replace function public.costo_de_lo_vendido(p_desde timestamptz, p_hasta timestamptz)
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
    ), 0) + coalesce((
      select sum((0 - mb.kg) * (b.costo::numeric / b.kg_inicial))
      from public.movimientos_balde mb
      join public.venta_items vi on vi.pote_id = mb.pote_id
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

-- El ranking de artículos agrupa los potes por formato y sabor ("Pote 1/2 kg ·
-- Frutilla"), no por cada pote físico. Cambia el tipo que devuelve: se
-- reemplaza entera.
drop function public.unidades_por_articulo(timestamptz, timestamptz);

create function public.unidades_por_articulo(p_desde timestamptz, p_hasta timestamptz)
returns table (
  formato_nombre text,
  presentacion_nombre text,
  presentacion_unidades integer,
  insumo_nombre text,
  balde_sabor_nombre text,
  pote_formato_nombre text,
  pote_sabor_nombre text,
  unidades integer,
  total integer
)
language sql
stable
set search_path = public, pg_temp
as $$
  select f.nombre, p.nombre, p.unidades, i.nombre, bs.nombre, pf.nombre, ps.nombre,
         count(*)::integer, sum(vi.precio)::integer
  from public.venta_items vi
  join public.ventas v on v.id = vi.venta_id
  left join public.formatos f on f.id = vi.formato_id
  left join public.presentaciones_insumo p on p.id = vi.presentacion_id
  left join public.insumos i on i.id = p.insumo_id
  left join public.baldes b on b.id = vi.balde_id
  left join public.sabores bs on bs.id = b.sabor_id
  left join public.potes pt on pt.id = vi.pote_id
  left join public.formatos pf on pf.id = pt.formato_id
  left join public.baldes pb on pb.id = pt.balde_id
  left join public.sabores ps on ps.id = pb.sabor_id
  where v.estado = 'cobrada' and v.creado_en >= p_desde and v.creado_en < p_hasta
  group by vi.formato_id, vi.presentacion_id, bs.id, pt.formato_id, ps.id,
           f.nombre, p.nombre, p.unidades, i.nombre, bs.nombre, pf.nombre, ps.nombre
  order by 8 desc, 9 desc;
$$;

revoke execute on function public.unidades_por_articulo(timestamptz, timestamptz)
  from public, anon;
grant execute on function public.unidades_por_articulo(timestamptz, timestamptz) to authenticated;
