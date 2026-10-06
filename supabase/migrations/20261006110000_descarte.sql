-- ============================================================================
-- Descarte (2 de 2): lo que se tira, con su costo.
-- ============================================================================
-- Goro quiere saber cuánto pierde por lo que se tira y qué es lo que más se
-- tira. Cada cosa tirada es una fila de `descartes` con el costo congelado en
-- ese momento, y además baja el stock en su ledger, en la misma transacción.
--
-- La cantidad la dice quien tira, pesada o a ojo. Nunca se toma como descarte
-- "lo que el sistema creía que quedaba": esa estimación sale de los gramos
-- teóricos de cada venta, y mezclarla con lo tirado es lo que hoy no deja ver
-- nada.
--
-- Puede descartar cualquiera con sesión: pasa en el mostrador, en el momento,
-- y con un permiso de por medio no se carga. Queda quién fue. Esto cambia
-- `descartar_pote`, que pedía `cargar_inventario`.
--
-- Necesita `20261006100000_descarte_tipos.sql` aplicada antes.
-- ============================================================================

create type public.tipo_descarte as enum ('balde', 'pote', 'insumo');
create type public.motivo_descarte as enum
  ('resto_de_balde', 'vencido', 'roto', 'derretido', 'otro');

create table public.descartes (
  id          integer generated always as identity primary key,
  tipo        public.tipo_descarte not null,
  -- En un pote también: es el balde del que salió, y lo que permite sumar
  -- baldes y potes por sabor.
  balde_id    integer references public.baldes (id),
  pote_id     integer references public.potes (id),
  insumo_id   integer references public.insumos (id),
  cantidad    numeric not null,
  -- Congelada: el dueño puede cambiar después la unidad de un insumo.
  unidad      public.unidad_insumo not null,
  motivo      public.motivo_descarte not null,
  nota        text,
  -- Congelado en pesos enteros: un reporte nunca lee el costo de hoy.
  costo       integer not null,
  clave       uuid,
  creado_por  uuid not null references public.perfiles (id),
  creado_en   timestamptz not null default now(),
  constraint cantidad_positiva check (cantidad > 0),
  constraint costo_de_descarte_no_negativo check (costo >= 0),
  constraint nota_corta check (nota is null or length(nota) <= 200),
  constraint lo_que_corresponde_a_cada_tipo check (
    (tipo = 'balde' and balde_id is not null and pote_id is null and insumo_id is null)
    or (tipo = 'pote' and pote_id is not null and balde_id is not null and insumo_id is null)
    or (tipo = 'insumo' and insumo_id is not null and balde_id is null and pote_id is null)
  ),
  -- Al revés no se exige: el día que se pueda tirar una parte de un balde sin
  -- terminarlo ("se cayó medio kilo"), ese descarte es de un balde con otro motivo.
  constraint resto_solo_de_balde check (motivo <> 'resto_de_balde' or tipo = 'balde'),
  constraint helado_en_kilos check (tipo = 'insumo' or unidad = 'kg')
);

-- Un pote se descarta una sola vez (regla 3): el `for update` ya lo evita; el
-- índice lo hace imposible.
create unique index un_descarte_por_pote on public.descartes (pote_id) where pote_id is not null;

-- Un doble clic en Descartar no tira dos veces (regla 5), mismo patrón que la
-- clave de cobro de las ventas.
create unique index un_descarte_por_clave on public.descartes (clave) where clave is not null;

-- El reporte filtra por período.
create index descartes_creado_en_idx on public.descartes (creado_en);

alter table public.descartes enable row level security;
grant select on public.descartes to authenticated;
revoke insert, update, delete, truncate on public.descartes from authenticated;
revoke all on public.descartes from anon;

create policy "descartes: cualquier sesion activa lee"
  on public.descartes for select to authenticated
  using (public.auth_rol() is not null);

-- ----------------------------------------------------------------------------
-- Se terminó el balde abierto, y quien lo vació dice cuánto se tiró.
--
-- Lo que el sistema creía que quedaba casi nunca es lo que se tiró: la venta
-- descuenta una estimación. La diferencia (para un lado o para el otro) es un
-- ajuste de la estimación; lo tirado es un descarte con su costo. El balde
-- termina siempre en cero, como antes.
--
-- Cambia la firma (suma `p_kg_tirado`), así que se borra la anterior. Con 0
-- hace lo mismo que la vieja: da de baja todo como ajuste.
-- ----------------------------------------------------------------------------
drop function public.vaciar_balde(integer);

create function public.vaciar_balde(p_balde_id integer, p_kg_tirado numeric default 0)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_balde public.baldes%rowtype;
  v_tirado numeric := coalesce(p_kg_tirado, 0);
begin
  if not coalesce(public.auth_rol() is not null, false) then
    raise exception 'Sin sesión activa';
  end if;

  select * into v_balde from public.baldes where id = p_balde_id for update;
  if v_balde.id is null then
    raise exception 'Balde inexistente.';
  end if;
  if v_balde.estado <> 'abierto' then
    raise exception 'Solo se puede dar por terminado un balde abierto.';
  end if;
  if v_tirado < 0 or v_tirado > v_balde.kg_inicial then
    raise exception 'Lo que se tiró tiene que estar entre 0 y % kg (lo que traía el balde).',
      v_balde.kg_inicial;
  end if;

  -- Después de esto el balde tiene justo lo que se tiró.
  if v_tirado <> v_balde.kg_restante then
    perform public.aplicar_movimiento_balde(
      p_balde_id, 'ajuste', v_tirado - v_balde.kg_restante, null);
  end if;

  if v_tirado > 0 then
    perform public.aplicar_movimiento_balde(p_balde_id, 'descarte', -v_tirado, null);
    insert into public.descartes (tipo, balde_id, cantidad, unidad, motivo, costo, creado_por)
    values ('balde', p_balde_id, v_tirado, 'kg', 'resto_de_balde',
            round(v_tirado * v_balde.costo / v_balde.kg_inicial)::integer, auth.uid());
  end if;

  update public.baldes set estado = 'vacio', salio_en = now() where id = p_balde_id;
end;
$$;

revoke execute on function public.vaciar_balde(integer, numeric) from public, anon;
grant execute on function public.vaciar_balde(integer, numeric) to authenticated;

-- ----------------------------------------------------------------------------
-- Descartar un pote del freezer, con su motivo. El helado no vuelve al balde:
-- ya había salido al armarlo (movimiento `armado`). Deja de pedir
-- `cargar_inventario`: las cuatro puertas del descarte tienen la misma regla.
-- `p_motivo` tiene default para que el código anterior siga andando entre que
-- se aplica esto y se despliega el nuevo.
-- ----------------------------------------------------------------------------
drop function public.descartar_pote(integer);

create function public.descartar_pote(
  p_pote_id integer,
  p_motivo public.motivo_descarte default 'otro',
  p_nota text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_pote public.potes%rowtype;
  v_motivo public.motivo_descarte := coalesce(p_motivo, 'otro');
  v_nota text := nullif(trim(p_nota), '');
  v_costo integer;
begin
  if not coalesce(public.auth_rol() is not null, false) then
    raise exception 'Sin sesión activa';
  end if;
  if v_motivo = 'resto_de_balde' then
    raise exception 'Un pote no es un resto de balde: elegí otro motivo.';
  end if;
  if length(v_nota) > 200 then
    raise exception 'La nota puede tener hasta 200 letras.';
  end if;

  select * into v_pote from public.potes where id = p_pote_id for update;
  if v_pote.id is null then
    raise exception 'Pote inexistente.';
  end if;
  if v_pote.estado <> 'impreso' then
    raise exception 'Solo se descarta un pote que sigue en el freezer.';
  end if;

  select round(v_pote.peso_g / 1000.0 * b.costo / b.kg_inicial)::integer into v_costo
    from public.baldes b where b.id = v_pote.balde_id;

  update public.potes set estado = 'descartado' where id = p_pote_id;
  insert into public.descartes
    (tipo, balde_id, pote_id, cantidad, unidad, motivo, nota, costo, creado_por)
  values ('pote', v_pote.balde_id, p_pote_id, v_pote.peso_g / 1000.0, 'kg', v_motivo,
          v_nota, v_costo, auth.uid());
end;
$$;

revoke execute on function public.descartar_pote(integer, public.motivo_descarte, text)
  from public, anon;
grant execute on function public.descartar_pote(integer, public.motivo_descarte, text)
  to authenticated;

-- ----------------------------------------------------------------------------
-- Descartar un producto, un insumo o un envase. Devuelve el id del descarte.
--
-- No se puede tirar más de lo que hay en stock: frena el 50 tipeado donde iba
-- 5, que inflaría el reporte en plata. Si el stock está mal, lo corrige quien
-- puede tocarlo.
-- ----------------------------------------------------------------------------
create function public.descartar_insumo(
  p_insumo_id integer,
  p_cantidad numeric,
  p_motivo public.motivo_descarte,
  p_nota text default null,
  p_clave uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_insumo public.insumos%rowtype;
  v_nota text := nullif(trim(p_nota), '');
  v_id integer;
begin
  if not coalesce(public.auth_rol() is not null, false) then
    raise exception 'Sin sesión activa';
  end if;

  -- Antes que nada: si este descarte ya entró (un doble clic, un reintento),
  -- se devuelve el mismo sin tocar el stock otra vez.
  if p_clave is not null then
    select id into v_id from public.descartes where clave = p_clave;
    if v_id is not null then
      return v_id;
    end if;
  end if;

  if p_motivo is null or p_motivo = 'resto_de_balde' then
    raise exception 'Elegí por qué se tira.';
  end if;
  if length(v_nota) > 200 then
    raise exception 'La nota puede tener hasta 200 letras.';
  end if;
  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'La cantidad tiene que ser mayor a cero.';
  end if;

  select * into v_insumo from public.insumos where id = p_insumo_id for update;
  if v_insumo.id is null then
    raise exception 'Ese artículo no existe.';
  end if;
  if v_insumo.unidad = 'u' and p_cantidad <> trunc(p_cantidad) then
    raise exception '% se cuenta por unidad: la cantidad tiene que ser entera.', v_insumo.nombre;
  end if;
  if p_cantidad > v_insumo.cantidad then
    raise exception 'El sistema tiene % de %; no se pueden descartar %. Avisale al dueño para corregir el stock.',
      v_insumo.cantidad, v_insumo.nombre, p_cantidad;
  end if;

  insert into public.descartes
    (tipo, insumo_id, cantidad, unidad, motivo, nota, costo, clave, creado_por)
  values ('insumo', p_insumo_id, p_cantidad, v_insumo.unidad, p_motivo, v_nota,
          round(p_cantidad * v_insumo.costo)::integer, p_clave, auth.uid())
  on conflict (clave) where clave is not null do nothing
  returning id into v_id;

  -- Perdió la carrera: otra transacción con la misma clave ya confirmó su
  -- descarte. Se devuelve ese, y el stock no se toca.
  if v_id is null then
    select id into v_id from public.descartes where clave = p_clave;
    return v_id;
  end if;

  perform public.aplicar_movimiento_insumo(p_insumo_id, 'descarte', -p_cantidad, null, 'Descarte');
  return v_id;
end;
$$;

revoke execute on function
  public.descartar_insumo(integer, numeric, public.motivo_descarte, text, uuid) from public, anon;
grant execute on function
  public.descartar_insumo(integer, numeric, public.motivo_descarte, text, uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- Para el Panel: cuánto se tiró en el período, en plata. Lleva su propio
-- filtro de sesión en el `where` (regla 1.2), además de la RLS de la tabla.
-- ----------------------------------------------------------------------------
create function public.costo_del_descarte(p_desde timestamptz, p_hasta timestamptz)
returns numeric
language sql
stable
set search_path = public, pg_temp
as $$
  select coalesce(sum(costo), 0)
  from public.descartes
  where creado_en >= p_desde and creado_en < p_hasta
    and public.auth_rol() is not null;
$$;

revoke execute on function public.costo_del_descarte(timestamptz, timestamptz) from public, anon;
grant execute on function public.costo_del_descarte(timestamptz, timestamptz) to authenticated;
