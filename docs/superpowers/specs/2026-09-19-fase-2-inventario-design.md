# Fase 2 — Inventario: sabores, insumos, baldes

Estado: aprobado en brainstorming, pendiente de plan de implementación.
Fecha: 2026-09-19.

## Contexto

Fase 1 (Núcleo) está aplicada y verificada de punta a punta. Esta fase
construye el primer pedazo real de negocio: los sabores como catálogo, los
baldes como unidad de inventario (Sección 3 del ROADMAP) y los insumos con su
movimiento de stock. No entra código de barras impreso/escaneado en baldes
(Fase 3) ni descuento de stock por venta (Fase 4) — solo alta de stock y las
transiciones de estado que no dependen de que exista un punto de venta.

Entregable verificable (ROADMAP): entran dos baldes de Frutilla, se abre uno y
el otro queda entero; Goro le pone a Frutilla un mínimo distinto del resto y
la alerta salta antes solo ahí.

## Corrección de base: el generador de códigos no tenía tipo para "balde"

`src/lib/codigos/codigo.ts` (Fase 0.1) definía tres tipos: `A` artículo, `P`
pote, `C` bachada (lote de producción — explícitamente fuera de alcance). El
borrador del ROADMAP para `baldes.codigo` usaba `GC0000042`, reciclando la
misma letra que "bachada". Eso rompe la garantía que el propio ROADMAP pide:
que la letra evite que dos naturalezas de código choquen.

Ya corregido (fuera de esta spec, aplicado directo por ser aditivo y de bajo
riesgo): se agregó un cuarto tipo `B` = "balde" a `TIPOS`, `PESO_TIPO` y a la
regex de `leerCodigo` (ahora derivada de `Object.keys(TIPOS)` en vez de una
lista repetida a mano, para que un quinto tipo futuro no pueda olvidarse de
actualizarla). Tests y ROADMAP actualizados. `npm run verificar` en verde.

## Modelo de datos

```sql
-- Fila única con parámetros que Goro edita sin deploy. El patrón
-- "default del comercio + override por fila" (sabores.stock_minimo, y más
-- adelante precio_balde) necesita que el default viva aparte de la columna:
-- un `default` de columna Postgres solo aplica al insertar, no actualiza
-- retroactivamente las filas ya guardadas en null.
create table public.config_comercio (
  id                    boolean primary key default true,
  stock_minimo_default  numeric not null,
  constraint una_sola_fila check (id)
);
insert into public.config_comercio (stock_minimo_default) values (2.5);

create table public.sabores (
  id            bigint generated always as identity primary key,
  nombre        text not null unique,
  activo        boolean not null default true,
  stock_minimo  numeric,  -- null = usa config_comercio.stock_minimo_default
  creado_en     timestamptz not null default now(),
  constraint nombre_no_vacio check (length(trim(nombre)) > 0),
  constraint stock_minimo_no_negativo check (stock_minimo is null or stock_minimo >= 0)
);

create type public.unidad_insumo as enum ('u', 'kg');

create sequence public.insumos_secuencia;

create table public.insumos (
  id         bigint generated always as identity primary key,
  nombre     text not null,
  codigo     text not null unique,  -- "GA000012", generado con generarCodigo('A', n)
  unidad     public.unidad_insumo not null,
  cantidad   numeric not null default 0,  -- cache; solo la mueve registrar_movimiento_insumo
  minimo     numeric not null,             -- siempre explícito, sin override (ver Decisiones)
  costo      integer not null,
  activo     boolean not null default true,
  creado_en  timestamptz not null default now(),
  constraint nombre_no_vacio check (length(trim(nombre)) > 0),
  constraint minimo_no_negativo check (minimo >= 0),
  constraint costo_no_negativo check (costo >= 0)
);

create type public.tipo_movimiento_insumo as enum ('entrada', 'ajuste');
-- 'consumo' se agrega como valor de enum (cambio aditivo) el día que una
-- venta empiece a descontar insumos.

create table public.movimientos_insumo (
  id          bigint generated always as identity primary key,
  insumo_id   bigint not null references public.insumos (id),
  tipo        public.tipo_movimiento_insumo not null,
  cantidad    numeric not null,  -- delta con signo
  motivo      text,
  creado_por  uuid not null references public.perfiles (id),
  creado_en   timestamptz not null default now()
);

create type public.estado_balde as enum
  ('cerrado', 'abierto', 'vendido', 'vacio', 'canjeado');

create sequence public.baldes_secuencia;

create table public.baldes (
  id            bigint generated always as identity primary key,
  codigo        text not null unique,  -- "GB000042", generado con generarCodigo('B', n)
  sabor_id      bigint not null references public.sabores (id),
  kg_inicial    numeric not null,
  kg_restante   numeric not null,
  estado        public.estado_balde not null default 'cerrado',
  costo         integer not null,
  costo_envase  integer not null,
  entro_en      timestamptz not null default now(),
  salio_en      timestamptz,
  constraint kg_en_rango check (kg_restante >= 0 and kg_restante <= kg_inicial)
);

-- Invariante "un solo balde abierto por sabor": índice único parcial, no un
-- select previo (Regla 3 de AGENTS.md / lección 3 de ciro-polirrubro).
create unique index un_balde_abierto_por_sabor
  on public.baldes (sabor_id)
  where estado = 'abierto';
```

`kg_inicial`/`kg_restante` quedan en **kilos**, no litros: el balde se compra
como "de 10 litros" (así lo vende el proveedor) pero se vende y se pesa en
kilos, que es la unidad que ya usa todo lo demás del sistema (costo por kilo,
etc.). Nada que migrar del borrador original del ROADMAP.

`venta_id` en `baldes` (presente en el borrador original del modelo de
etiquetas) se pospone: no hay tabla `ventas` todavía, y agregar la columna
después es aditivo.

## RLS

Mismo patrón que Núcleo: `security definer` con `coalesce(..., false)`, cada
tabla con sus cuatro cosas (RLS, grant, revoke de anon, políticas), y ninguna
vista/tabla nueva confía en el grant por defecto de Supabase sin su propio
filtro en el `using`.

- **`config_comercio`**: `select` para cualquier sesión activa; `update` solo
  dueño; sin `insert`/`delete` (la fila la siembra la migración).
- **`sabores`**: `select` para cualquier sesión activa; `insert`/`update`
  solo dueño (alta, activar/desactivar, tocar `stock_minimo`). Sin `delete`
  — se desactiva, no se borra (mismo criterio que `perfiles`).
- **`insumos`**: `select` para cualquier sesión activa; `insert` solo dueño;
  `update` con **grant por columna** (`nombre, unidad, minimo, costo,
  activo`) también solo dueño — `cantidad` queda deliberadamente fuera de
  cualquier grant de `update`: la única forma de tocarla es la función
  `registrar_movimiento_insumo`, que corre `security definer` y no depende
  del grant de la tabla.
- **`movimientos_insumo`**: `select` para cualquier sesión activa;
  **sin `insert`/`update`/`delete` para `authenticated`** — es un ledger
  inmutable al que solo se entra por la función. Esto evita que alguien
  inserte un movimiento sin que se actualice `insumos.cantidad`, que sería
  una fuente real de descuadre (no de seguridad, de integridad).
- **`baldes`**: `select` para cualquier sesión activa; `insert` para
  cualquier sesión activa (dar de alta un balde es tarea de mostrador
  también); `update` con grant por columna limitado a `estado`, y la
  transición forzada por la propia política:

  ```sql
  create policy "baldes: abrir de cerrado a abierto"
    on public.baldes for update to authenticated
    using (public.auth_rol() is not null and estado = 'cerrado')
    with check (estado = 'abierto');
  ```

  No hace falta una función aparte para abrir un balde: la política ya hace
  imposible cualquier otra transición, y el índice único parcial ya cubre el
  invariante de "uno abierto por sabor". `kg_restante` no es actualizable por
  nadie todavía — arranca en Fase 4, con su propia función, cuando empiece a
  descontarse de verdad.

## Funciones

```sql
create or replace function public.registrar_movimiento_insumo(
  p_insumo_id bigint,
  p_tipo public.tipo_movimiento_insumo,
  p_cantidad numeric,
  p_motivo text
) returns void
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
```

Alta de código para `insumos` y `baldes`: el generador (`generarCodigo`) es
TypeScript puro y ya está testeado — no se reescribe en SQL. Cada tabla tiene
su secuencia (`insumos_secuencia`, `baldes_secuencia`) y una función mínima
que expone `nextval` sin tener que otorgar `usage` directo sobre la
secuencia:

```sql
create function public.siguiente_numero_balde() returns bigint
language sql security definer set search_path = public, pg_temp
as $$ select nextval('public.baldes_secuencia'); $$;

grant execute on function public.siguiente_numero_balde to authenticated;
-- análogo: siguiente_numero_insumo() + insumos_secuencia
```

El Server Action pide el número, arma el código en TS
(`generarCodigo('B', n)` / `generarCodigo('A', n)`) e inserta la fila con el
código ya resuelto. El `unique` de la columna es respaldo, no la barrera
principal: `nextval()` ya garantiza que dos altas simultáneas no puedan
repetir número.

## Alerta de stock mínimo

Confirmado con el cliente: el mínimo compara contra **el balde abierto de ese
sabor**, no contra la suma de la reserva en cámara. Es la señal de "hay que
abrir el próximo ya", no de "hay que pedirle al proveedor".

```
sabor_en_alerta(sabor, baldeAbierto, configComercio):
  si no hay baldeAbierto                              → alerta
  efectivo = sabor.stock_minimo ?? configComercio.stock_minimo_default
  si baldeAbierto.kg_restante <= efectivo             → alerta
  si no                                                → sin alerta
```

Función pura en `src/modulos/inventario/alerta.ts` (o similar), sin tocar la
base — se testea con Vitest normal. Verificable en esta fase sin que exista
Ventas: si el override de Frutilla queda por encima de lo que le queda a un
balde recién abierto (10 kg-ish) dispara; con el default (2,5) el resto no.

## Pantallas

Un módulo nuevo, `src/modulos/inventario/`, porque baldes depende de sabores
y las tres tablas comparten el mismo flujo de "entra mercadería" (regla de
AGENTS.md: un módulo no importa de las `consultas/` de otro; lo compartido
sube a `lib/`).

```
src/modulos/inventario/
  tipos.ts
  consultas/
    sabores.ts     listarSabores, crearSabor, editarSabor
    insumos.ts     listarInsumos, crearInsumo, registrarMovimiento
    baldes.ts      listarBaldes, darDeAltaBalde, abrirBalde
  componentes/
    (listas y formularios de cada sección)
  rls.test.ts
```

`config_comercio` no vive dentro de `inventario/`: Catálogo (Fase 2b) también
la va a necesitar (`precio_balde_default`), así que sus consultas
(`obtenerConfigComercio`, `editarStockMinimoDefault`) suben a
`src/lib/configComercio.ts`.

Una sola entrada de menú, "Inventario" (visible para ambos roles en
`config/navegacion.ts`), con tres secciones en una sola página — sin tabs,
por la regla de "una vista visible por vez" del prompt base: Sabores, Baldes,
Insumos. `page.tsx` delega en componentes, no acumula lógica (límite de 200
líneas de AGENTS.md).

## Testing

- **Unitario**: `alerta.ts` (función pura, sin DB) — casos: sin balde
  abierto, por debajo del default, por debajo del override, por encima de
  ambos.
- **`rls.test.ts`**: se escribe (qué NO puede hacer un colaborador: crear un
  sabor, editar `insumos.costo`, insertar directo en `movimientos_insumo`,
  abrir un balde que ya está abierto, etc.), pero **no corre en CI todavía**
  — mismo criterio que Núcleo: falta el proyecto Supabase de prueba
  (`SUPABASE_PRUEBAS`). No bloquea esta fase.

## Fuera de alcance de esta fase

- Código de barras impreso/escaneado en baldes e insumos (Fase 3).
- Descuento de `kg_restante` e insumos por venta, y el valor `'consumo'` del
  enum de movimientos (Fase 4).
- Transiciones de balde más allá de abrir (`vendido`, `vacio`, `canjeado`) y
  su columna `venta_id` (Fase 4/9).
- Pantalla para editar `config_comercio.stock_minimo_default` desde la UI —
  por ahora se siembra y se ajusta por SQL, igual que la promoción a dueño de
  Fase 1.
- `precio_balde` por sabor (Fase 2b, Catálogo).

## Decisiones tomadas en el brainstorming

1. Ledger (`movimientos_insumo`) solo para insumos por ahora; baldes no
   necesitan ledger porque `kg_restante` no se descuenta hasta Fase 4.
2. `baldes.codigo` se genera ya, al dar de alta el balde (no se espera a
   Fase 3) — requirió agregar el tipo `B` al generador (ver arriba).
3. `insumos.minimo` es una columna simple y obligatoria, sin patrón de
   override — a diferencia de `sabores.stock_minimo`, no hay un caso de
   negocio real todavía que pida un default compartido entre insumos de
   unidades distintas (`u` vs `kg`).
4. Unidad de baldes: kilos. "10 litros" es la forma en que se compra, no la
   unidad de stock.
5. El mínimo de alerta compara contra el balde abierto, no contra el total
   de la reserva.
