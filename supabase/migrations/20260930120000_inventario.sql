-- ============================================================================
-- Inventario: sabores, insumos (insumos, productos y envases), sus
-- movimientos y los baldes.
-- ============================================================================
-- Mismo criterio que Núcleo: RLS activa desde la creación, grant explícito a
-- authenticated, revoke de anon, y toda función `security definer` compara
-- roles con `coalesce(..., false)` (por eso se usa es_duenio()).
--
-- Las funciones que solo deben llamar otras funciones (aplicar_movimiento_*,
-- codigo_articulo) se cierran con `revoke ... from public, anon,
-- authenticated`: Postgres otorga EXECUTE a PUBLIC por default en toda función
-- nueva, y PUBLIC incluye a `authenticated`.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Fila única de parámetros que Goro edita sin deploy. El patrón "default del
-- comercio + override por fila" (sabores.stock_minimo) necesita que el
-- default viva acá y no en un `default` de columna: un `default` de Postgres
-- solo aplica al insertar, no actualiza retroactivamente las filas que ya
-- quedaron en null.
-- ----------------------------------------------------------------------------
create table public.config_comercio (
  id                    boolean primary key default true,
  stock_minimo_default  numeric not null,
  constraint una_sola_fila check (id),
  constraint stock_minimo_default_no_negativo check (stock_minimo_default >= 0)
);

insert into public.config_comercio (stock_minimo_default) values (2.5);

alter table public.config_comercio enable row level security;
grant select, update on public.config_comercio to authenticated;
revoke all on public.config_comercio from anon;
revoke insert, delete on public.config_comercio from authenticated;

create policy "config_comercio: cualquier sesion activa lee"
  on public.config_comercio for select to authenticated
  using (public.auth_rol() is not null);

create policy "config_comercio: solo el dueño edita"
  on public.config_comercio for update to authenticated
  using (public.es_duenio())
  with check (public.es_duenio());

-- ----------------------------------------------------------------------------
-- Sabores: catálogo. No llevan código propio (Sección 1 del ROADMAP: solo
-- insumos, potes y baldes lo llevan). El color es un dato de negocio, no un
-- token de diseño: el color real de cada sabor aparece igual en todos lados.
--
-- Un sabor cargado por error tiene que poder desaparecer; si ya tiene baldes,
-- la foreign key de baldes.sabor_id rechaza el borrado sola.
-- ----------------------------------------------------------------------------
create table public.sabores (
  id            integer generated always as identity primary key,
  nombre        text not null unique,
  activo        boolean not null default true,
  stock_minimo  numeric,  -- null = usa config_comercio.stock_minimo_default
  color         text not null default '#3F6B3A',
  creado_en     timestamptz not null default now(),
  constraint nombre_no_vacio check (length(trim(nombre)) > 0),
  constraint stock_minimo_no_negativo check (stock_minimo is null or stock_minimo >= 0),
  constraint color_formato_hex check (color ~ '^#[0-9a-fA-F]{6}$')
);

alter table public.sabores enable row level security;
grant select, insert, update, delete on public.sabores to authenticated;
revoke all on public.sabores from anon;

create policy "sabores: cualquier sesion activa lee"
  on public.sabores for select to authenticated
  using (public.auth_rol() is not null);

create policy "sabores: solo el dueño da de alta"
  on public.sabores for insert to authenticated
  with check (public.es_duenio());

create policy "sabores: solo el dueño edita"
  on public.sabores for update to authenticated
  using (public.es_duenio())
  with check (public.es_duenio());

create policy "sabores: solo el dueño borra"
  on public.sabores for delete to authenticated
  using (public.es_duenio());

-- ----------------------------------------------------------------------------
-- Código de ARTÍCULO (tipo A, ver src/lib/codigos/codigo.ts). El número de
-- secuencia sale de una función para no otorgar `usage` directo sobre la
-- secuencia. codigo_articulo() es el mismo cálculo de dígito verificador que
-- digitoVerificador() en TypeScript: suma ponderada 3/1 módulo 10, con el
-- tipo A pesando 1 en la posición 0. Un test compara ambas.
-- ----------------------------------------------------------------------------
create sequence public.insumos_secuencia;
revoke all on sequence public.insumos_secuencia from anon, authenticated;

create function public.siguiente_numero_insumo()
returns integer
language sql
security definer
set search_path = public, pg_temp
as $$
  select nextval('public.insumos_secuencia')::integer;
$$;

revoke execute on function public.siguiente_numero_insumo() from public, anon;
grant execute on function public.siguiente_numero_insumo() to authenticated;

create function public.codigo_articulo(p_numero integer)
returns text
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  v_secuencia text;
  v_suma integer := 3;  -- el tipo (peso 1) en la posición 0, que pesa 3
  i integer;
begin
  if p_numero is null or p_numero < 1 or p_numero > 999999 then
    raise exception 'Secuencia fuera de rango (1..999999): %', p_numero;
  end if;

  v_secuencia := lpad(p_numero::text, 6, '0');
  for i in 1..6 loop
    v_suma := v_suma + substr(v_secuencia, i, 1)::integer * case when i % 2 = 1 then 1 else 3 end;
  end loop;

  return 'GA' || v_secuencia || ((10 - v_suma % 10) % 10)::text;
end;
$$;

revoke execute on function public.codigo_articulo(integer) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- Insumos. Tres tipos que se ven en pantallas distintas:
--   insumo   lo que se consume (potes vacíos, cucharitas).
--   producto lo de freezer que se vende por unidad o docena (bombón, palito).
--   envase   el stock propio de un formato (su cono, canasta o vasito). Nace
--            atado a UN formato, se maneja desde ese formato y no aparece en
--            las listas de insumos ni de productos.
-- El tipo no se edita después de creado (no está en el `grant update`).
--
-- "Un formato tiene a lo sumo un envase" es el índice único de formato_id, no
-- un select previo (Regla 3), y el check ata el tipo a la columna.
-- ----------------------------------------------------------------------------
create type public.unidad_insumo as enum ('u', 'kg');
create type public.tipo_insumo as enum ('insumo', 'producto', 'envase');

create table public.insumos (
  id         integer generated always as identity primary key,
  nombre     text not null unique,
  codigo     text not null unique,
  unidad     public.unidad_insumo not null,
  tipo       public.tipo_insumo not null default 'insumo',
  formato_id integer unique references public.formatos (id),
  cantidad   numeric not null default 0,  -- cache; solo la mueve aplicar_movimiento_insumo
  minimo     numeric not null,
  costo      integer not null,  -- lo que le cuesta a Goro UNA unidad; el precio de venta vive en las presentaciones
  activo     boolean not null default true,
  creado_en  timestamptz not null default now(),
  constraint nombre_no_vacio check (length(trim(nombre)) > 0),
  constraint minimo_no_negativo check (minimo >= 0),
  constraint costo_no_negativo check (costo >= 0),
  constraint codigo_bien_formado check (codigo ~ '^GA\d{7}$'),
  constraint envase_ligado_a_un_formato check ((tipo = 'envase') = (formato_id is not null))
);

alter table public.insumos enable row level security;
grant select, insert, delete on public.insumos to authenticated;
grant update (nombre, unidad, minimo, costo, activo) on public.insumos to authenticated;
revoke all on public.insumos from anon;

create policy "insumos: cualquier sesion activa lee"
  on public.insumos for select to authenticated
  using (public.auth_rol() is not null);

-- cantidad = 0: el alta no puede pisar el cache de stock, solo
-- aplicar_movimiento_insumo lo mueve (Regla 2).
create policy "insumos: solo el dueño da de alta"
  on public.insumos for insert to authenticated
  with check (public.es_duenio() and cantidad = 0);

create policy "insumos: solo el dueño edita el catalogo"
  on public.insumos for update to authenticated
  using (public.es_duenio())
  with check (public.es_duenio());

-- Un insumo cargado por error tiene que poder desaparecer; si ya tiene
-- movimientos o presentaciones, sus foreign keys rechazan el borrado solas.
create policy "insumos: solo el dueño borra"
  on public.insumos for delete to authenticated
  using (public.es_duenio());

-- ----------------------------------------------------------------------------
-- Movimientos de insumo: ledger inmutable. Nadie inserta directo. Las únicas
-- puertas son aplicar_movimiento_insumo (interna) y, para entradas y ajustes
-- a mano, registrar_movimiento_insumo.
-- `venta_item_id` liga el movimiento a lo que lo causó; su foreign key la
-- agrega la migración de Ventas, que es la que crea venta_items.
-- ----------------------------------------------------------------------------
create type public.tipo_movimiento_insumo as enum ('entrada', 'ajuste', 'venta', 'anulacion');

create table public.movimientos_insumo (
  id            integer generated always as identity primary key,
  insumo_id     integer not null references public.insumos (id),
  venta_item_id integer,
  tipo          public.tipo_movimiento_insumo not null,
  cantidad      numeric not null,  -- delta con signo
  motivo        text,
  creado_por    uuid not null references public.perfiles (id),
  creado_en     timestamptz not null default now(),
  constraint cantidad_no_cero check (cantidad <> 0)
);

alter table public.movimientos_insumo enable row level security;
grant select on public.movimientos_insumo to authenticated;
revoke all on public.movimientos_insumo from anon;

create policy "movimientos_insumo: cualquier sesion activa lee"
  on public.movimientos_insumo for select to authenticated
  using (public.auth_rol() is not null);

-- La única función que escribe el ledger y mueve el cache `insumos.cantidad`,
-- en la misma transacción (Regla 1). El stock puede quedar negativo a
-- propósito (decisión de Goro): con el cliente esperando, lo que está mal es
-- el conteo, no la venta.
create function public.aplicar_movimiento_insumo(
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
begin
  insert into public.movimientos_insumo (insumo_id, venta_item_id, tipo, cantidad, motivo, creado_por)
  values (p_insumo_id, p_venta_item_id, p_tipo, p_cantidad, p_motivo, auth.uid());

  update public.insumos set cantidad = cantidad + p_cantidad where id = p_insumo_id;
end;
$$;

revoke execute on function public.aplicar_movimiento_insumo(integer, public.tipo_movimiento_insumo, numeric, integer, text)
  from public, anon, authenticated;

-- Entradas y ajustes a mano. 'venta' y 'anulacion' son solo de
-- registrar_venta y anular_venta: sin esta guarda, cualquier sesión podía
-- escribir un movimiento de venta sin venta detrás.
create function public.registrar_movimiento_insumo(
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

  if p_tipo not in ('entrada', 'ajuste') then
    raise exception 'Tipo de movimiento inválido: solo entrada o ajuste.';
  end if;

  perform public.aplicar_movimiento_insumo(p_insumo_id, p_tipo, p_cantidad, null, p_motivo);
end;
$$;

revoke execute on function public.registrar_movimiento_insumo(integer, public.tipo_movimiento_insumo, numeric, text)
  from public, anon;
grant execute on function public.registrar_movimiento_insumo(integer, public.tipo_movimiento_insumo, numeric, text)
  to authenticated;

-- ----------------------------------------------------------------------------
-- Baldes: código de UNIDAD (tipo B), la unidad real de inventario
-- (Sección 3 del ROADMAP). kg_inicial/kg_restante en kilos: el balde se
-- compra "de 10 litros" pero se pesa y se vende en kilos.
-- ----------------------------------------------------------------------------
create type public.estado_balde as enum
  ('cerrado', 'abierto', 'vendido', 'vacio', 'canjeado');

create sequence public.baldes_secuencia;
revoke all on sequence public.baldes_secuencia from anon, authenticated;

create function public.siguiente_numero_balde()
returns integer
language sql
security definer
set search_path = public, pg_temp
as $$
  select nextval('public.baldes_secuencia')::integer;
$$;

revoke execute on function public.siguiente_numero_balde() from public, anon;
grant execute on function public.siguiente_numero_balde() to authenticated;

create table public.baldes (
  id            integer generated always as identity primary key,
  codigo        text not null unique,
  sabor_id      integer not null references public.sabores (id),
  kg_inicial    numeric not null,
  kg_restante   numeric not null,
  estado        public.estado_balde not null default 'cerrado',
  costo         integer not null,
  costo_envase  integer not null,
  entro_en      timestamptz not null default now(),
  salio_en      timestamptz,
  constraint kg_inicial_positivo check (kg_inicial > 0),
  constraint kg_restante_en_rango check (kg_restante >= 0 and kg_restante <= kg_inicial),
  constraint costo_no_negativo check (costo >= 0 and costo_envase >= 0),
  constraint codigo_bien_formado check (codigo ~ '^GB\d{7}$')
);

-- Invariante "un solo balde abierto por sabor": índice único parcial, no un
-- select previo (Regla 3).
create unique index un_balde_abierto_por_sabor
  on public.baldes (sabor_id)
  where estado = 'abierto';

alter table public.baldes enable row level security;
grant select, insert, delete on public.baldes to authenticated;
grant update (estado) on public.baldes to authenticated;
revoke all on public.baldes from anon;

create policy "baldes: cualquier sesion activa lee"
  on public.baldes for select to authenticated
  using (public.auth_rol() is not null);

-- Un balde siempre nace cerrado y con kg_restante = kg_inicial: nadie puede
-- insertarlo ya "usado" desde el cliente.
create policy "baldes: cualquier sesion activa da de alta"
  on public.baldes for insert to authenticated
  with check (
    public.auth_rol() is not null
    and estado = 'cerrado'
    and kg_restante = kg_inicial
  );

-- Única transición posible desde acá: cerrado → abierto. El índice único
-- parcial de arriba es lo que impide dos abiertos del mismo sabor.
create policy "baldes: abrir de cerrado a abierto"
  on public.baldes for update to authenticated
  using (public.auth_rol() is not null and estado = 'cerrado')
  with check (estado = 'abierto');

-- Borrar un balde: solo mientras está 'cerrado'. Un balde 'abierto' puede
-- estar en uso real sin ninguna fila en movimientos_balde todavía (abrir no
-- genera movimiento), así que la foreign key sola no lo protege: la condición
-- de estado es la barrera. Una vez abierto, corregir es un ajuste.
create policy "baldes: solo el dueño borra, y solo si está cerrado"
  on public.baldes for delete to authenticated
  using (public.es_duenio() and estado = 'cerrado');
