# Fase 4 (recorte) — Ventas: cobrar a dedo

Estado: aprobado en brainstorming, pendiente de plan de implementación.
Fecha: 2026-09-21.

## Contexto

El ROADMAP describe Fase 4 como "mostrador, baldes enteros e insumos sueltos,
pistola, anulación", y depende de Fase 3 (Etiquetas y códigos de barras:
tabla `potes`, función `resolver_codigo()`, impresión), que a su vez está
bloqueada por Fase 0.2/0.3 (probar la pistola real, decidir la impresora) —
pruebas físicas a las que el usuario no puede comprometerse todavía.

Explorando el esquema actual apareció una segunda razón, independiente del
escaneo, para recortar el alcance: **hoy solo `formatos` tiene un precio de
venta.** `insumos` solo tiene `costo` (de compra), y `sabores.precio_balde`
(para vender un balde entero) fue explícitamente diferido durante Fase 2b.
Insumo suelto y balde entero no se pueden cobrar sin antes definirles un
precio — no es solo el escaneo lo que falta.

**Esta fase construye la parte de Ventas que sí se puede cobrar hoy: un
ticket armado a mano, con uno o más formatos, cada uno con los sabores que
el vendedor elige en el momento — sin lector, sin insumo suelto, sin balde
entero.**

## Decisiones de alcance (brainstorming)

1. **Solo formatos.** Insumo suelto y balde entero quedan para una vuelta
   posterior, cuando tengan precio de venta propio.
2. **Sin escaneo.** Elegir formato y sabores a mano; el lector se agrega
   cuando exista Fase 3.
3. **Un ticket puede tener varios items distintos** (`ventas` cabecera +
   `venta_items` detalle) — es el modelo real de un mostrador, y evita
   migrar a un carrito el día que se sume el pote escaneado o el balde
   entero al mismo cobro.
4. **La cantidad de sabores de un formato es un cupo, no un mínimo.** Un
   "1 kilo, 4 sabores" se puede vender con 1, 2, 3 o 4 sabores distintos —
   nunca el mismo sabor repetido dentro del mismo item (elegir menos
   sabores ya reparte más peso a cada uno).
5. **El descuento de stock es una estimación**, porque no hay báscula real
   todavía (eso es Fase 3): `gramos del formato / cantidad de sabores
   elegidos`, aplicado como un movimiento — nunca se pisa `kg_restante`
   (Regla 2 de AGENTS.md).
6. **Medios de pago**: efectivo, tarjeta, transferencia.
7. **Anular una venta**: cualquier sesión activa, no solo el dueño — Fase 8
   (permisos granulares por usuario) todavía no existe; cuando exista, esta
   regla se puede volver más fina.
8. **Corregir el sabor de un item ya cobrado** es una operación distinta de
   anular: el caso real es "pidió frutilla y chocolate, cambió chocolate
   por vainilla antes de irse". Función aparte, ver más abajo.
9. **Ajustar `kg_restante` a fin de día** (la estimación de la Decisión 5
   puede no coincidir con lo que realmente queda) es una función y un
   control aparte, que vive en Inventario/Baldes — no es una operación de
   venta, es una corrección de stock igual que un ajuste de insumo.
10. **La lectura de catálogo sube a `lib/`.** `listarSabores`, `listarBaldes`
    y `listarFormatos` (con los tipos `Sabor`, `Balde`/`EstadoBalde`,
    `Formato`) hoy viven en `consultas/` de Inventario; Ventas también los
    necesita, y AGENTS.md prohíbe que un módulo importe de las `consultas/`
    de otro. Inventario sigue siendo dueño de las escrituras (crear, editar,
    activar) — solo la lectura pasa a ser compartida.

## Modelo de datos

```sql
create type public.medio_pago as enum ('efectivo', 'tarjeta', 'transferencia');
create type public.estado_venta as enum ('cobrada', 'anulada');

create table public.ventas (
  id           integer generated always as identity primary key,
  medio_pago   public.medio_pago not null,
  total        integer not null,              -- cache: suma de venta_items.precio al cobrar
  estado       public.estado_venta not null default 'cobrada',
  creado_por   uuid not null references public.perfiles (id),
  creado_en    timestamptz not null default now(),
  anulado_por  uuid references public.perfiles (id),
  anulado_en   timestamptz,
  constraint total_no_negativo check (total >= 0)
);

create table public.venta_items (
  id          integer generated always as identity primary key,
  venta_id    integer not null references public.ventas (id),
  formato_id  integer not null references public.formatos (id),
  precio      integer not null,                -- congelado del formato al vender
  constraint precio_no_negativo check (precio >= 0)
);

-- Ledger de baldes: mismo criterio que movimientos_insumo, nunca se pisa
-- kg_restante con un número absoluto. `venta_item_id` es nulo para los
-- ajustes de fin de día (Decisión 9), que no vienen de ningún ticket.
create type public.tipo_movimiento_balde as enum
  ('venta', 'anulacion', 'correccion', 'ajuste');

create table public.movimientos_balde (
  id            integer generated always as identity primary key,
  balde_id      integer not null references public.baldes (id),
  venta_item_id integer references public.venta_items (id),
  tipo          public.tipo_movimiento_balde not null,
  kg            numeric not null,               -- delta con signo
  creado_por    uuid not null references public.perfiles (id),
  creado_en     timestamptz not null default now(),
  constraint kg_no_cero check (kg <> 0)
);
```

Cada fila de `movimientos_balde` ya dice qué sabor se vendió (vía
`balde.sabor_id`) — no hace falta una tabla aparte para registrar qué
sabores llevó cada item. El ranking de sabores de Fase 7 va a leer de acá
sin que esta fase tenga que anticiparle nada más.

## Funciones (todas `security definer`, todas en la misma migración)

### `aplicar_movimiento_balde` — la única que escribe de verdad

```sql
create function public.aplicar_movimiento_balde(
  p_balde_id integer,
  p_tipo public.tipo_movimiento_balde,
  p_kg numeric,
  p_venta_item_id integer
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.movimientos_balde (balde_id, venta_item_id, tipo, kg, creado_por)
  values (p_balde_id, p_venta_item_id, p_tipo, p_kg, auth.uid());

  update public.baldes set kg_restante = kg_restante + p_kg where id = p_balde_id;
end;
$$;
```

**Sin `grant execute` a `authenticated`.** Nadie la llama por RPC directo —
solo las funciones de abajo, desde adentro. Es lo que impide que alguien
dispare un movimiento `'venta'` sin pasar por `registrar_venta`, o un
`'anulacion'` sin pasar por `anular_venta`.

### `registrar_venta` — arma el ticket completo

```sql
create function public.registrar_venta(
  p_items jsonb,       -- [{"formato_id": 3, "sabor_ids": [1, 2]}, ...]
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
  v_formato public.formatos%rowtype;
  v_sabor_nombre text;
  v_sabor_ids integer[];
  v_cantidad_sabores integer;
  v_kg numeric;
  v_sabor_id integer;
  v_balde_id integer;
  v_item_id integer;
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
    select * into v_formato from public.formatos
      where id = (v_item->>'formato_id')::integer and activo
      for update;
    if not found then
      raise exception 'Formato inválido o inactivo.';
    end if;

    select array_agg(distinct value::integer) into v_sabor_ids
      from jsonb_array_elements_text(v_item->'sabor_ids');
    v_cantidad_sabores := coalesce(array_length(v_sabor_ids, 1), 0);

    if v_cantidad_sabores < 1 or v_cantidad_sabores > v_formato.cantidad_sabores then
      raise exception 'Elegí entre 1 y % sabores para %.', v_formato.cantidad_sabores, v_formato.nombre;
    end if;

    insert into public.venta_items (venta_id, formato_id, precio)
    values (v_venta_id, v_formato.id, v_formato.precio)
    returning id into v_item_id;

    v_total := v_total + v_formato.precio;
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
  end loop;

  update public.ventas set total = v_total where id = v_venta_id;

  return v_venta_id;
end;
$$;

grant execute on function public.registrar_venta to authenticated;
```

Precio y gramos se leen del servidor (`v_formato`), nunca del cliente — el
`for update` evita que un cambio de precio a mitad de camino contamine el
ticket. Si algún sabor no tiene balde abierto, o el balde no alcanza (el
`check kg_restante >= 0` que ya existe desde Fase 2 lo frena solo), toda la
función aborta: es una sola transacción, no se cobra la mitad de un ticket
(Regla 1 de AGENTS.md).

**El `hint = 'sin_balde_abierto'` y el `detail` con el `sabor_id`** son lo
que la Server Action usa para ofrecer "Abrir balde de X" ahí mismo, sin que
el vendedor tenga que salir de Ventas — `PostgrestError` ya expone
`.hint`/`.details`/`.message` como campos nativos, no hay que inventar nada.

### `anular_venta`

```sql
create function public.anular_venta(p_venta_id integer)
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

  update public.ventas
    set estado = 'anulada', anulado_por = auth.uid(), anulado_en = now()
    where id = p_venta_id;
end;
$$;

grant execute on function public.anular_venta to authenticated;
```

Agrupa por balde antes de revertir: si un item ya tuvo una corrección de
sabor, el neto por balde puede venir de más de una fila de
`movimientos_balde`, y hay que devolver exactamente lo que quedó afectando
a cada uno, no la fila `'venta'` original sola.

### `corregir_sabor_venta_item`

```sql
create function public.corregir_sabor_venta_item(
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

grant execute on function public.corregir_sabor_venta_item to authenticated;
```

Busca el balde viejo **exacto** que se debitó para ese item (agregando
`movimientos_balde` por balde, no "el balde abierto de ese sabor" en
genérico — puede que ya no sea el mismo), le devuelve el kg neto, y se lo
saca al balde que está abierto ahora del sabor nuevo. El mismo `hint =
'sin_balde_abierto'` aplica acá también, por la misma razón.

### `registrar_ajuste_balde` — corrección de fin de día, vive junto a Baldes

```sql
create function public.registrar_ajuste_balde(
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
  if p_kg = 0 then
    raise exception 'El ajuste no puede ser cero.';
  end if;

  perform public.aplicar_movimiento_balde(p_balde_id, 'ajuste', p_kg, null);
end;
$$;

grant execute on function public.registrar_ajuste_balde to authenticated;
```

Esta función y su control en pantalla van en `src/modulos/inventario/`, no
en Ventas: corregir cuánto quedó realmente en un balde es una operación de
stock, no de venta, aunque la necesidad haya salido de esta conversación.

## RLS

`ventas`, `venta_items` y `movimientos_balde` quedan de solo lectura para
`authenticated` — mismo criterio que `movimientos_insumo`: la única puerta
de escritura son las funciones de arriba.

```sql
alter table public.ventas enable row level security;
grant select on public.ventas to authenticated;
revoke all on public.ventas from anon;
create policy "ventas: cualquier sesion activa lee"
  on public.ventas for select to authenticated
  using (public.auth_rol() is not null);

alter table public.venta_items enable row level security;
grant select on public.venta_items to authenticated;
revoke all on public.venta_items from anon;
create policy "venta_items: cualquier sesion activa lee"
  on public.venta_items for select to authenticated
  using (public.auth_rol() is not null);

alter table public.movimientos_balde enable row level security;
grant select on public.movimientos_balde to authenticated;
revoke all on public.movimientos_balde from anon;
create policy "movimientos_balde: cualquier sesion activa lee"
  on public.movimientos_balde for select to authenticated
  using (public.auth_rol() is not null);
```

Ninguna de las tres tablas recibe `grant insert/update/delete` para
`authenticated` — no hace falta revocarlo explícitamente porque nunca se
otorgó. `baldes.kg_restante` lo sigue actualizando solo
`aplicar_movimiento_balde`, que al ser `security definer` no depende del
`grant update (estado)` que ya existía para `baldes` desde Fase 2.

## Refactor: lectura de catálogo sube a `lib/`

Mover, tal cual, sin cambiar RLS ni comportamiento:

- `src/modulos/inventario/consultas/sabores.ts` → `src/lib/sabores.ts`
  (incluye `type Sabor`, hoy en `inventario/tipos.ts`)
- `src/modulos/inventario/consultas/baldes.ts` → `src/lib/baldes.ts`
  (incluye `type Balde`, `type EstadoBalde`)
- `src/modulos/inventario/consultas/formatos.ts` → `src/lib/formatos.ts`
  (incluye `type Formato`)

Actualizar los imports en los componentes de Inventario que ya los usan
(`SeccionSabores`, `SeccionBaldes`, `SeccionFormatos`, `FilaFormato`,
`FormularioBalde`, `alerta.ts`/`alerta.test.ts`) para apuntar a `@/lib/...`
en vez de `../consultas/...` / `../tipos`. `Insumo`, `UnidadInsumo` y
`TipoMovimientoInsumo` se quedan en `inventario/tipos.ts` — nada más los
necesita todavía.

## Pantallas — módulo nuevo `src/modulos/ventas/`

```
src/modulos/ventas/
  tipos.ts              MedioPago, EstadoVenta, ItemDeTicket (carrito en memoria),
                         VentaReciente, ItemVentaReciente
  consultas/
    ventas.ts           listarVentasRecientes()
    acciones.ts         registrarVenta, anularVenta, corregirSaborVentaItem
  componentes/
    FormularioTicket.tsx          arma el carrito y cobra (client component,
                                   estado local con los items agregados)
    SelectorFormatoYSabores.tsx   sub-parte: elegir formato + sabores hasta
                                   el cupo, "Agregar al ticket"
    SeccionUltimasVentas.tsx      lista de ventas recientes (Server Component)
    FilaVentaReciente.tsx         una venta: sus items, botón "Anular"
    CorregirSaborItem.tsx         por item, selector sabor viejo → sabor nuevo
  rls.test.ts
```

`listarVentasRecientes()` trae las últimas ventas con sus items (join a
`formatos` por nombre) y, por cada item, los movimientos de balde
asociados — agrupados en memoria por sabor para mostrar cuáles quedan
netamente cargados a ese item (una corrección puede haber revertido uno y
cargado otro).

**`FormularioTicket`**: agregar ítems de a uno con `SelectorFormatoYSabores`
antes de cobrar (sin llamada al servidor todavía — es estado local), sacar
alguno si el vendedor se equivocó, elegir medio de pago, y recién ahí
`registrarVenta` manda el array completo. Si la acción falla con `hint ===
'sin_balde_abierto'`, la Server Action busca un balde `'cerrado'` de ese
sabor (`select id from baldes where sabor_id = X and estado = 'cerrado'
order by entro_en limit 1`) y lo devuelve en el estado; la pantalla muestra
el error y, si encontró uno, un botón "Abrir balde de X" que reutiliza
`abrirBalde` (de Inventario, Fase 2) sin perder el carrito en construcción.
Si no hay ni un balde cerrado de ese sabor, el mensaje lo dice así — ahí no
hay nada para abrir, hace falta dar de alta uno desde Inventario.

**`/ventas`**: página nueva con dos secciones — el ticket arriba, últimas
ventas abajo — visible para ambos roles (cualquier sesión activa cobra),
con entrada de menú propia en `config/navegacion.ts`.

## Testing

- **`rls.test.ts` del módulo Ventas**: cualquier sesión activa (dueño y
  colaborador) puede `registrar_venta`, `anular_venta` y
  `corregir_sabor_venta_item`; nadie puede insertar directo en `ventas`,
  `venta_items` ni `movimientos_balde`; llamar a `aplicar_movimiento_balde`
  por RPC falla para cualquiera (sin `grant execute`), mismo patrón que "no
  puede pedir el próximo número de secuencia" en Inventario.
- **`rls.test.ts` de Inventario** se extiende con un caso para
  `registrar_ajuste_balde` (cualquier sesión activa puede llamarla).
- Sin test unitario de lógica pura nueva: el reparto de gramos y las
  validaciones viven dentro de las funciones de Postgres, que es lo que
  `rls.test.ts` ejercita end-to-end contra una base real.
- Migración: se escribe el archivo, no se aplica — la corre el usuario a
  mano en el SQL Editor de Supabase, mismo criterio que las anteriores.
- Verificación manual de cierre: cobrar un ticket con dos items y sabores
  distintos, confirmar que los baldes correspondientes bajan lo esperado;
  intentar vender un sabor sin balde abierto y abrirlo desde el error sin
  perder el carrito; corregir el sabor de un item ya cobrado y confirmar
  que el balde viejo recupera el kg y el nuevo lo pierde; anular una venta
  y confirmar que todos los baldes involucrados vuelven a su valor
  original; ajustar un balde a mano desde Inventario.

## Fuera de alcance de esta fase

- Insumo suelto y balde entero (sin precio de venta propio todavía).
- Escaneo de código de barras y todo lo de Fase 3 (potes, `resolver_codigo`,
  impresión).
- Caja / arqueo (Fase 5) — registrar una venta no toca caja todavía; Caja
  va a leer de `ventas` cuando exista.
- Cuenta corriente / clientes (fuera de alcance general del proyecto).
- Ranking de sabores (Fase 7) — los datos ya quedan disponibles en
  `movimientos_balde`, pero la pantalla es de otra fase.
- Permisos granulares de anulación por usuario (Fase 8) — hoy "cualquier
  sesión activa" para todo.

## Migración

Archivo nuevo: `supabase/migrations/20260921120000_ventas.sql`.
