-- ============================================================================
-- Inventario: sabores, insumos y baldes.
-- ============================================================================
-- Mismo criterio que la migración de Núcleo: RLS activa desde la creación,
-- grant explícito a authenticated, revoke de anon, y toda función
-- `security definer` compara roles con `coalesce(..., false)`.
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
-- insumos, potes y baldes lo llevan).
-- ----------------------------------------------------------------------------
create table public.sabores (
  id            integer generated always as identity primary key,
  nombre        text not null unique,
  activo        boolean not null default true,
  stock_minimo  numeric,  -- null = usa config_comercio.stock_minimo_default
  creado_en     timestamptz not null default now(),
  constraint nombre_no_vacio check (length(trim(nombre)) > 0),
  constraint stock_minimo_no_negativo check (stock_minimo is null or stock_minimo >= 0)
);

alter table public.sabores enable row level security;
grant select, insert, update on public.sabores to authenticated;
revoke all on public.sabores from anon;
revoke delete on public.sabores from authenticated;  -- no se borra, se desactiva

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

-- ----------------------------------------------------------------------------
-- Insumos: código de ARTÍCULO (tipo A, ver src/lib/codigos/codigo.ts). El
-- número de secuencia sale de una función para no otorgar `usage` directo
-- sobre la secuencia.
-- ----------------------------------------------------------------------------
create type public.unidad_insumo as enum ('u', 'kg');

create sequence public.insumos_secuencia;

create function public.siguiente_numero_insumo()
returns integer
language sql
security definer
set search_path = public, pg_temp
as $$
  select nextval('public.insumos_secuencia')::integer;
$$;

grant execute on function public.siguiente_numero_insumo to authenticated;

create table public.insumos (
  id         integer generated always as identity primary key,
  nombre     text not null,
  codigo     text not null unique,
  unidad     public.unidad_insumo not null,
  cantidad   numeric not null default 0,  -- cache; solo la mueve registrar_movimiento_insumo
  minimo     numeric not null,
  costo      integer not null,
  activo     boolean not null default true,
  creado_en  timestamptz not null default now(),
  constraint nombre_no_vacio check (length(trim(nombre)) > 0),
  constraint minimo_no_negativo check (minimo >= 0),
  constraint costo_no_negativo check (costo >= 0),
  constraint codigo_bien_formado check (codigo ~ '^GA\d{7}$')
);

alter table public.insumos enable row level security;
grant select, insert on public.insumos to authenticated;
grant update (nombre, unidad, minimo, costo, activo) on public.insumos to authenticated;
revoke all on public.insumos from anon;
revoke delete on public.insumos from authenticated;

create policy "insumos: cualquier sesion activa lee"
  on public.insumos for select to authenticated
  using (public.auth_rol() is not null);

create policy "insumos: solo el dueño da de alta"
  on public.insumos for insert to authenticated
  with check (public.es_duenio());

create policy "insumos: solo el dueño edita el catalogo"
  on public.insumos for update to authenticated
  using (public.es_duenio())
  with check (public.es_duenio());

-- ----------------------------------------------------------------------------
-- Movimientos de insumo: ledger inmutable. Nadie inserta directo — revoke
-- total de insert/update/delete a authenticated. La única puerta es la
-- función de abajo, que además actualiza el cache `insumos.cantidad` en la
-- misma transacción (Regla 1: una operación de negocio, una transacción).
-- ----------------------------------------------------------------------------
create type public.tipo_movimiento_insumo as enum ('entrada', 'ajuste');
-- 'consumo' se agrega como valor de enum (cambio aditivo) el día que una
-- venta empiece a descontar insumos.

create table public.movimientos_insumo (
  id          integer generated always as identity primary key,
  insumo_id   integer not null references public.insumos (id),
  tipo        public.tipo_movimiento_insumo not null,
  cantidad    numeric not null,  -- delta con signo
  motivo      text,
  creado_por  uuid not null references public.perfiles (id),
  creado_en   timestamptz not null default now(),
  constraint cantidad_no_cero check (cantidad <> 0)
);

alter table public.movimientos_insumo enable row level security;
grant select on public.movimientos_insumo to authenticated;
revoke all on public.movimientos_insumo from anon;
revoke insert, update, delete on public.movimientos_insumo from authenticated;

create policy "movimientos_insumo: cualquier sesion activa lee"
  on public.movimientos_insumo for select to authenticated
  using (public.auth_rol() is not null);

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

  insert into public.movimientos_insumo (insumo_id, tipo, cantidad, motivo, creado_por)
  values (p_insumo_id, p_tipo, p_cantidad, p_motivo, auth.uid());

  update public.insumos set cantidad = cantidad + p_cantidad where id = p_insumo_id;
end;
$$;

grant execute on function public.registrar_movimiento_insumo to authenticated;

-- ----------------------------------------------------------------------------
-- Baldes: código de UNIDAD (tipo B), la unidad real de inventario
-- (Sección 3 del ROADMAP). kg_inicial/kg_restante en kilos: el balde se
-- compra "de 10 litros" pero se pesa y se vende en kilos.
-- ----------------------------------------------------------------------------
create type public.estado_balde as enum
  ('cerrado', 'abierto', 'vendido', 'vacio', 'canjeado');

create sequence public.baldes_secuencia;

create function public.siguiente_numero_balde()
returns integer
language sql
security definer
set search_path = public, pg_temp
as $$
  select nextval('public.baldes_secuencia')::integer;
$$;

grant execute on function public.siguiente_numero_balde to authenticated;

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
grant select, insert on public.baldes to authenticated;
grant update (estado) on public.baldes to authenticated;
revoke all on public.baldes from anon;
revoke delete on public.baldes from authenticated;

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
