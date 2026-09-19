# Fase 2 — Inventario: Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir sabores, insumos y baldes como el primer pedazo real de
negocio del sistema: catálogo de sabores con mínimo configurable, insumos con
su ledger de movimientos, y baldes como unidad de inventario con su propio
código y ciclo de vida (cerrado → abierto).

**Architecture:** Un módulo nuevo `src/modulos/inventario/` siguiendo
exactamente el patrón ya establecido en `src/modulos/auth/` (consultas
server-only separadas de las Server Actions, tipos propios, componentes
propios). Una sola migración SQL nueva sobre Postgres/Supabase, con RLS
activa desde la creación en las cuatro tablas nuevas. Una función pura
(`alerta.ts`) decide si un sabor necesita atención, sin tocar la base.

**Tech Stack:** Next.js App Router (Server Components + Server Actions),
Supabase (Postgres, RLS), TypeScript, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-19-fase-2-inventario-design.md`

## Global Constraints

- Todo en español: tablas, columnas, funciones, variables, mensajes de error (AGENTS.md).
- 200 líneas por archivo, 100 por función — lo corta ESLint (AGENTS.md).
- Ningún color literal fuera de `src/estilos/tema.css` (AGENTS.md).
- Toda función `security definer` compara roles con `coalesce(..., false)`, nunca pelado (AGENTS.md / prompt base regla 1).
- Todo invariante de "solo puede haber uno" vive en un índice único parcial, nunca en un `select` previo (AGENTS.md / prompt base regla 3).
- Toda validación de negocio existe también como `check` en la columna (AGENTS.md / prompt base regla 4).
- El stock nunca se pisa con un número absoluto: siempre se suma un movimiento (AGENTS.md regla 2).
- Ninguna migración se aplica sola: se escribe el archivo y el usuario la corre a mano en el SQL Editor de Supabase, igual que la de Núcleo (histórico de esta sesión).
- `npm run verificar` (formato + lint + typecheck + tests unitarios) tiene que pasar antes de cada commit.
- `rls.test.ts` se escribe pero no se ejecuta en CI todavía — falta el proyecto Supabase de prueba (`SUPABASE_PRUEBAS`). Ya está excluido de `npm run test:unit` por el glob `--exclude "**/*.rls.test.ts"` en `package.json`, así que no requiere ningún cambio de configuración.

## Notas frente a la spec

Dos ajustes de implementación, menores, respecto a `2026-09-19-fase-2-inventario-design.md`:

1. **Claves primarias `integer generated always as identity`, no `bigint`.**
   PostgREST devuelve columnas `bigint` como *string* en JS (para no perder
   precisión), lo que obligaría a parsear cada `id`. Un `integer` (hasta
   ~2.147 millones) nunca es un problema para una heladería de un local, y
   PostgREST lo devuelve como `number` nativo. Mismo criterio para las
   funciones `siguiente_numero_balde()`/`siguiente_numero_insumo()`: casteadas
   a `integer` en su `return`, para no tener que parsear el resultado del
   `.rpc()` antes de pasarlo a `generarCodigo()`.
2. **La alerta de mínimo se muestra en la sección Baldes, no en Sabores.**
   Sabores es catálogo (nombre, mínimo configurable); la alerta necesita
   cruzar sabor + balde abierto + default del comercio, y esa información
   vive naturalmente donde se ve y se actúa: al lado de los baldes.

Todo lo demás (modelo de datos, RLS, funciones, alcance) sigue la spec al pie
de la letra.

---

### Task 1: Migración SQL — tablas, tipos, funciones, RLS

**Files:**
- Create: `supabase/migrations/20260919130000_inventario.sql`
- Modify: `supabase/README.md`
- Modify: `ROADMAP.md`

**Interfaces:**
- Produces (para el resto del plan): tablas `config_comercio`, `sabores`,
  `insumos`, `movimientos_insumo`, `baldes`; funciones RPC
  `siguiente_numero_insumo()`, `siguiente_numero_balde()`,
  `registrar_movimiento_insumo(p_insumo_id integer, p_tipo public.tipo_movimiento_insumo, p_cantidad numeric, p_motivo text|null)`
  — `p_tipo` es el enum `('entrada', 'ajuste')`, no `text`; PostgREST castea
  un string JS que matchee un valor del enum sin que el cliente haga nada
  especial. Ninguna de estas existe todavía en el código — las tareas
  siguientes las consumen por nombre exacto.

- [ ] **Step 1: Escribir la migración completa**

```sql
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
```

- [ ] **Step 2: Actualizar el checklist de migraciones en `supabase/README.md`**

Buscar esta tabla:

```markdown
| Migración                      | Aplicada |
| ------------------------------ | -------- |
| `20260912120000_nucleo.sql`    | ✅       |
```

Y agregar la fila nueva (sin marcar, todavía no se aplicó):

```markdown
| Migración                      | Aplicada |
| ------------------------------ | -------- |
| `20260912120000_nucleo.sql`    | ✅       |
| `20260919130000_inventario.sql`| ⬜       |
```

- [ ] **Step 3: Anotar el estado en `ROADMAP.md`**

Buscar la fila de "Sistema real" en la sección "0. Dónde estamos hoy":

```markdown
| Sistema real                   | Núcleo escrito: ingreso por usuario, roles, RLS, menú por rol. Falta aplicar la migración en Supabase.          |
```

Reemplazar por:

```markdown
| Sistema real                   | Núcleo aplicado: ingreso por usuario, roles, RLS, menú por rol. Inventario (sabores, insumos, baldes) escrito, falta aplicar la migración. |
```

Y en la tabla de "Fases de construcción", actualizar las filas 1 y 2:

```markdown
| **1**  | **Núcleo** — auth, roles, layout, navegación, esquema base, RLS ← _escrito, falta aplicar la migración_ | Goro entra con su usuario, Ana entra con el suyo, y cada uno ve un menú distinto                                                                                                                                       |
| **2**  | **Inventario** — baldes identificados, insumos, movimientos, y **edición del producto**        | Entran dos baldes de Frutilla; se abre uno y el otro queda entero. Goro le pone a Frutilla un mínimo distinto que al resto y la alerta salta antes solo ahí                                                                    |
```

Reemplazar por:

```markdown
| **1**  | **Núcleo** — auth, roles, layout, navegación, esquema base, RLS ← _aplicado_ | Goro entra con su usuario, Ana entra con el suyo, y cada uno ve un menú distinto                                                                                                                                       |
| **2**  | **Inventario** — baldes identificados, insumos, movimientos, y **edición del producto** ← _escrito, falta aplicar la migración_ | Entran dos baldes de Frutilla; se abre uno y el otro queda entero. Goro le pone a Frutilla un mínimo distinto que al resto y la alerta salta antes solo ahí                                                                    |
```

- [ ] **Step 4: Verificar y commitear**

```bash
npm run verificar
git add supabase/migrations/20260919130000_inventario.sql supabase/README.md ROADMAP.md
git commit -m "Escribir migración de Inventario: sabores, insumos, baldes"
```

`npm run verificar` no toca SQL, pero confirma que nada de Markdown/TS quedó
roto. La migración en sí se valida recién en el Task 10, cuando el usuario la
aplica a mano.

---

### Task 2: `src/lib/configComercio.ts`

**Files:**
- Create: `src/lib/configComercio.ts`

**Interfaces:**
- Consumes: tabla `config_comercio` (Task 1), `clienteServidor()` de `@/lib/supabase/servidor`.
- Produces: `type ConfigComercio = { stockMinimoDefault: number }`, `obtenerConfigComercio(): Promise<ConfigComercio>`.

- [ ] **Step 1: Escribir el archivo**

```typescript
import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";

/**
 * Fila única de parámetros que Goro edita sin deploy. El patrón "default del
 * comercio + override por fila" (ver sabores.stock_minimo) necesita que el
 * default viva acá y no en un `default` de columna: así cambiarlo actualiza
 * a todas las filas en null sin tocarlas una por una.
 */
export type ConfigComercio = {
  stockMinimoDefault: number;
};

export async function obtenerConfigComercio(): Promise<ConfigComercio> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("config_comercio")
    .select("stock_minimo_default")
    .single<{ stock_minimo_default: string }>();

  return { stockMinimoDefault: Number(data?.stock_minimo_default ?? 0) };
}
```

- [ ] **Step 2: Verificar y commitear**

```bash
npm run verificar
git add src/lib/configComercio.ts
git commit -m "Agregar configComercio: lectura del default del comercio"
```

---

### Task 3: Tipos del módulo Inventario

**Files:**
- Create: `src/modulos/inventario/tipos.ts`

**Interfaces:**
- Produces: `Sabor`, `UnidadInsumo`, `Insumo`, `TipoMovimientoInsumo`, `EstadoBalde`, `Balde` — usados por todas las tareas siguientes de este módulo.

- [ ] **Step 1: Escribir el archivo**

```typescript
export type Sabor = {
  id: number;
  nombre: string;
  activo: boolean;
  stockMinimo: number | null;
};

export type UnidadInsumo = "u" | "kg";

export type Insumo = {
  id: number;
  nombre: string;
  codigo: string;
  unidad: UnidadInsumo;
  cantidad: number;
  minimo: number;
  costo: number;
  activo: boolean;
};

export type TipoMovimientoInsumo = "entrada" | "ajuste";

export type EstadoBalde = "cerrado" | "abierto" | "vendido" | "vacio" | "canjeado";

export type Balde = {
  id: number;
  codigo: string;
  saborId: number;
  kgInicial: number;
  kgRestante: number;
  estado: EstadoBalde;
  costo: number;
  costoEnvase: number;
};
```

- [ ] **Step 2: Verificar y commitear**

```bash
npm run verificar
git add src/modulos/inventario/tipos.ts
git commit -m "Agregar tipos del módulo Inventario"
```

---

### Task 4: Función de alerta de stock mínimo (TDD)

**Files:**
- Create: `src/modulos/inventario/alerta.ts`
- Test: `src/modulos/inventario/alerta.test.ts`

**Interfaces:**
- Consumes: `Sabor`, `Balde` de `./tipos` (Task 3).
- Produces: `saborEnAlerta(sabor: Pick<Sabor, "stockMinimo">, baldeAbierto: Pick<Balde, "kgRestante"> | null, stockMinimoDefault: number): boolean` — la usa `SeccionBaldes` (Task 7).

- [ ] **Step 1: Escribir el test (falla porque `alerta.ts` no existe)**

```typescript
import { describe, expect, it } from "vitest";
import { saborEnAlerta } from "./alerta";

describe("saborEnAlerta", () => {
  it("alerta si no hay ningún balde abierto", () => {
    expect(saborEnAlerta({ stockMinimo: null }, null, 2.5)).toBe(true);
  });

  it("no alerta si el balde abierto tiene más que el mínimo por defecto", () => {
    expect(saborEnAlerta({ stockMinimo: null }, { kgRestante: 9 }, 2.5)).toBe(false);
  });

  it("alerta si el balde abierto bajó del mínimo por defecto", () => {
    expect(saborEnAlerta({ stockMinimo: null }, { kgRestante: 2 }, 2.5)).toBe(true);
  });

  it("usa el override del sabor en vez del default", () => {
    // Frutilla pide que avisen antes: un mínimo más alto que el default.
    expect(saborEnAlerta({ stockMinimo: 6 }, { kgRestante: 7 }, 2.5)).toBe(false);
    expect(saborEnAlerta({ stockMinimo: 6 }, { kgRestante: 5 }, 2.5)).toBe(true);
  });

  it("alerta justo en el límite, no solo por debajo", () => {
    expect(saborEnAlerta({ stockMinimo: null }, { kgRestante: 2.5 }, 2.5)).toBe(true);
  });
});
```

- [ ] **Step 2: Correr el test y confirmar que falla**

Run: `npx vitest run src/modulos/inventario/alerta.test.ts`
Expected: FAIL — `Cannot find module './alerta'`

- [ ] **Step 3: Escribir la implementación mínima**

```typescript
import type { Balde, Sabor } from "./tipos";

/**
 * El mínimo compara contra el balde ABIERTO de ese sabor (el que se está
 * sirviendo), no contra el total de la reserva en cámara: avisa "hay que
 * abrir el próximo ya", no "hay que pedirle al proveedor".
 */
export function saborEnAlerta(
  sabor: Pick<Sabor, "stockMinimo">,
  baldeAbierto: Pick<Balde, "kgRestante"> | null,
  stockMinimoDefault: number,
): boolean {
  if (!baldeAbierto) return true;

  const minimoEfectivo = sabor.stockMinimo ?? stockMinimoDefault;
  return baldeAbierto.kgRestante <= minimoEfectivo;
}
```

- [ ] **Step 4: Correr el test y confirmar que pasa**

Run: `npx vitest run src/modulos/inventario/alerta.test.ts`
Expected: PASS — 5 tests

- [ ] **Step 5: Verificar y commitear**

```bash
npm run verificar
git add src/modulos/inventario/alerta.ts src/modulos/inventario/alerta.test.ts
git commit -m "Agregar saborEnAlerta con tests"
```

---

### Task 5: Sabores — consultas, acciones y UI

**Files:**
- Create: `src/lib/useAccionConReset.ts`
- Create: `src/modulos/inventario/consultas/sabores.ts`
- Create: `src/modulos/inventario/consultas/acciones.ts`
- Create: `src/modulos/inventario/componentes/FormularioSabor.tsx`
- Create: `src/modulos/inventario/componentes/FormularioMinimo.tsx`
- Create: `src/modulos/inventario/componentes/SeccionSabores.tsx`

**Interfaces:**
- Consumes: `Sabor` de `../tipos` (Task 3); `clienteServidor()` de `@/lib/supabase/servidor`; `Boton` de `@/componentes/Boton`; `Campo` de `@/componentes/Campo`; tabla `sabores` (Task 1).
- Produces: `useAccionConReset<Estado extends { error: string | null }>(accion, inicial): { estado, accion, enviando, formRef }` — hook compartido que envuelven todos los formularios de "crear algo" del módulo (evita repetir el mismo `useActionState` + `useRef` + `useEffect` de reset en cada uno; lo van a usar los Tasks 6 y 7 también). `listarSabores(): Promise<Sabor[]>`; `type EstadoFormulario = { error: string | null }`; Server Actions `crearSabor` y `editarStockMinimo` (firma `(prev: EstadoFormulario, datos: FormData) => Promise<EstadoFormulario>`); componentes `<FormularioSabor />` y `<SeccionSabores esDuenio={boolean} />` — esta última la usa `page.tsx` en el Task 8. `acciones.ts` lo van a seguir extendiendo los Tasks 6 y 7.

- [ ] **Step 1: Escribir `consultas/sabores.ts`**

```typescript
import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { Sabor } from "../tipos";

type FilaSabor = {
  id: number;
  nombre: string;
  activo: boolean;
  stock_minimo: string | null;
};

function mapearSabor(fila: FilaSabor): Sabor {
  return {
    id: fila.id,
    nombre: fila.nombre,
    activo: fila.activo,
    stockMinimo: fila.stock_minimo === null ? null : Number(fila.stock_minimo),
  };
}

/** Todos los sabores. RLS ya limita esto a cualquier sesión activa. */
export async function listarSabores(): Promise<Sabor[]> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("sabores")
    .select("id, nombre, activo, stock_minimo")
    .order("activo", { ascending: false })
    .order("nombre");

  return ((data as FilaSabor[] | null) ?? []).map(mapearSabor);
}
```

- [ ] **Step 2: Escribir `consultas/acciones.ts`**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { clienteServidor } from "@/lib/supabase/servidor";

export type EstadoFormulario = { error: string | null };

const SIN_ERROR: EstadoFormulario = { error: null };

/** RLS es la barrera real (solo dueño); acá solo se arma un mensaje si falla. */
export async function crearSabor(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const nombre = String(datos.get("nombre") ?? "").trim();
  if (!nombre) return { error: "Escribí un nombre." };

  const supabase = await clienteServidor();
  const { error } = await supabase.from("sabores").insert({ nombre });

  if (error) {
    if (error.code === "23505") return { error: `Ya existe un sabor "${nombre}".` };
    return { error: "No se pudo crear el sabor." };
  }

  revalidatePath("/inventario");
  return SIN_ERROR;
}

/** `valor` vacío = volver a usar el mínimo por defecto del comercio. */
export async function editarStockMinimo(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const saborId = Number(datos.get("saborId"));
  const valor = String(datos.get("stockMinimo") ?? "").trim();

  if (valor !== "" && (Number.isNaN(Number(valor)) || Number(valor) < 0)) {
    return { error: "El mínimo tiene que ser un número positivo, o vacío para el default." };
  }

  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("sabores")
    .update({ stock_minimo: valor === "" ? null : Number(valor) })
    .eq("id", saborId);

  if (error) return { error: "No se pudo guardar el mínimo." };

  revalidatePath("/inventario");
  return SIN_ERROR;
}
```

- [ ] **Step 3: Escribir el hook compartido `src/lib/useAccionConReset.ts`**

Los formularios de "crear algo" de este módulo (sabor, insumo, balde, y el
registro de movimiento) repiten el mismo patrón: `useActionState` +
`useRef` + un `useEffect` que limpia el formulario cuando la acción termina
sin error. En vez de repetirlo cuatro veces, un hook:

```typescript
"use client";

import { useActionState, useEffect, useRef } from "react";

type EstadoConError = { error: string | null };

/**
 * Envuelve useActionState y limpia el formulario cuando la acción termina
 * sin error. Sirve para formularios de "crear algo" (se vacía después de
 * un alta exitosa) — no para formularios de "editar algo" (ahí NO se quiere
 * vaciar lo que se acaba de guardar).
 */
export function useAccionConReset<Estado extends EstadoConError>(
  accion: (previo: Estado, datos: FormData) => Promise<Estado>,
  inicial: Estado,
) {
  const [estado, accionEnvuelta, enviando] = useActionState(accion, inicial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!estado.error) formRef.current?.reset();
  }, [estado]);

  return { estado, accion: accionEnvuelta, enviando, formRef };
}
```

- [ ] **Step 4: Escribir `componentes/FormularioSabor.tsx`**

```tsx
"use client";

import { Boton } from "@/componentes/Boton";
import { Campo } from "@/componentes/Campo";
import { useAccionConReset } from "@/lib/useAccionConReset";
import { crearSabor } from "../consultas/acciones";

const INICIAL = { error: null };

export function FormularioSabor() {
  const { estado, accion, enviando, formRef } = useAccionConReset(crearSabor, INICIAL);

  return (
    <form ref={formRef} action={accion} className="flex items-end gap-2">
      <Campo id="nombre-sabor" name="nombre" etiqueta="Sabor nuevo" required />
      <Boton type="submit" disabled={enviando}>
        {enviando ? "Creando…" : "Agregar"}
      </Boton>
      {estado.error && (
        <p role="alert" className="text-sm text-alerta">
          {estado.error}
        </p>
      )}
    </form>
  );
}
```

- [ ] **Step 5: Escribir `componentes/FormularioMinimo.tsx`**

```tsx
"use client";

import { useActionState } from "react";
import { editarStockMinimo } from "../consultas/acciones";

const INICIAL = { error: null };

export function FormularioMinimo({
  saborId,
  valorActual,
}: {
  saborId: number;
  valorActual: number | null;
}) {
  const [estado, accion, enviando] = useActionState(editarStockMinimo, INICIAL);

  return (
    <form action={accion} className="flex items-center gap-2">
      <input type="hidden" name="saborId" value={saborId} />
      <input
        type="number"
        name="stockMinimo"
        step="0.1"
        min="0"
        defaultValue={valorActual ?? ""}
        placeholder="default"
        aria-label="Mínimo en kg"
        className="numero w-20 rounded-(--r) border border-linea bg-superficie px-2 py-1 text-sm"
        disabled={enviando}
      />
      <button type="submit" disabled={enviando} className="text-xs underline opacity-70">
        Guardar
      </button>
      {estado.error && (
        <span role="alert" className="text-xs text-alerta">
          {estado.error}
        </span>
      )}
    </form>
  );
}
```

- [ ] **Step 6: Escribir `componentes/SeccionSabores.tsx`**

```tsx
import { listarSabores } from "../consultas/sabores";
import { FormularioMinimo } from "./FormularioMinimo";
import { FormularioSabor } from "./FormularioSabor";

export async function SeccionSabores({ esDuenio }: { esDuenio: boolean }) {
  const sabores = await listarSabores();

  return (
    <section className="flex flex-col gap-4 rounded-(--r-grande) border border-linea bg-superficie p-6">
      <header>
        <h2 className="font-display text-lg font-semibold">Sabores</h2>
        <p className="text-sm text-texto-suave">
          El mínimo en blanco usa el default del comercio.
        </p>
      </header>

      <table className="w-full text-left text-sm">
        <thead className="border-b border-linea text-xs text-texto-suave uppercase">
          <tr>
            <th className="p-2">Sabor</th>
            <th className="p-2">Mínimo (kg)</th>
          </tr>
        </thead>
        <tbody>
          {sabores.map((sabor) => (
            <tr key={sabor.id} className="border-b border-linea last:border-0">
              <td className="p-2">{sabor.nombre}</td>
              <td className="numero p-2">
                {esDuenio ? (
                  <FormularioMinimo saborId={sabor.id} valorActual={sabor.stockMinimo} />
                ) : (
                  (sabor.stockMinimo ?? "default")
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {esDuenio && <FormularioSabor />}
    </section>
  );
}
```

- [ ] **Step 7: Verificar y commitear**

```bash
npm run verificar
git add src/lib/useAccionConReset.ts src/modulos/inventario/consultas/sabores.ts src/modulos/inventario/consultas/acciones.ts src/modulos/inventario/componentes/FormularioSabor.tsx src/modulos/inventario/componentes/FormularioMinimo.tsx src/modulos/inventario/componentes/SeccionSabores.tsx
git commit -m "Agregar Sabores: catálogo con mínimo configurable"
```

`npm run verificar` no puede probar contra una base real todavía (la
migración no está aplicada) — lo que confirma acá es que todo tipa y lintea
limpio. La prueba real es el Task 10.

---

### Task 6: Insumos — consultas, acciones y UI

**Files:**
- Create: `src/modulos/inventario/consultas/insumos.ts`
- Modify: `src/modulos/inventario/consultas/acciones.ts` (agregar `crearInsumo`, `registrarMovimiento`)
- Create: `src/modulos/inventario/componentes/FormularioInsumo.tsx`
- Create: `src/modulos/inventario/componentes/FormularioMovimiento.tsx`
- Create: `src/modulos/inventario/componentes/SeccionInsumos.tsx`

**Interfaces:**
- Consumes: `Insumo`, `UnidadInsumo` de `../tipos` (Task 3); `EstadoFormulario`/`SIN_ERROR` ya definidos en `acciones.ts` (Task 5); `useAccionConReset` de `@/lib/useAccionConReset` (Task 5); `generarCodigo` de `@/lib/codigos/codigo`; RPC `siguiente_numero_insumo()` y `registrar_movimiento_insumo(...)` (Task 1).
- Produces: `listarInsumos(): Promise<Insumo[]>`; Server Actions `crearInsumo`, `registrarMovimiento`; `<SeccionInsumos esDuenio={boolean} />`, usado por `page.tsx` en el Task 8.

- [ ] **Step 1: Escribir `consultas/insumos.ts`**

```typescript
import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { Insumo, UnidadInsumo } from "../tipos";

type FilaInsumo = {
  id: number;
  nombre: string;
  codigo: string;
  unidad: UnidadInsumo;
  cantidad: string;
  minimo: string;
  costo: number;
  activo: boolean;
};

function mapearInsumo(fila: FilaInsumo): Insumo {
  return {
    id: fila.id,
    nombre: fila.nombre,
    codigo: fila.codigo,
    unidad: fila.unidad,
    cantidad: Number(fila.cantidad),
    minimo: Number(fila.minimo),
    costo: fila.costo,
    activo: fila.activo,
  };
}

export async function listarInsumos(): Promise<Insumo[]> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("insumos")
    .select("id, nombre, codigo, unidad, cantidad, minimo, costo, activo")
    .order("nombre");

  return ((data as FilaInsumo[] | null) ?? []).map(mapearInsumo);
}
```

- [ ] **Step 2: Agregar a `consultas/acciones.ts`**

Agregar el import al principio del archivo (junto a los que ya están):

```typescript
import { generarCodigo } from "@/lib/codigos/codigo";
```

Y agregar al final del archivo:

```typescript
export async function crearInsumo(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const nombre = String(datos.get("nombre") ?? "").trim();
  const unidad = String(datos.get("unidad") ?? "");
  const minimo = Number(datos.get("minimo"));
  const costo = Number(datos.get("costo"));

  if (!nombre) return { error: "Escribí un nombre." };
  if (unidad !== "u" && unidad !== "kg") return { error: "Elegí una unidad." };
  if (!Number.isFinite(minimo) || minimo < 0) {
    return { error: "El mínimo tiene que ser un número positivo." };
  }
  if (!Number.isInteger(costo) || costo < 0) {
    return { error: "El costo tiene que ser un número entero positivo." };
  }

  const supabase = await clienteServidor();
  const { data: numero, error: errorSecuencia } = await supabase.rpc("siguiente_numero_insumo");
  if (errorSecuencia || numero === null) return { error: "No se pudo generar el código." };

  const codigo = generarCodigo("A", numero);
  const { error } = await supabase
    .from("insumos")
    .insert({ nombre, codigo, unidad, minimo, costo });

  if (error) return { error: "No se pudo crear el insumo." };

  revalidatePath("/inventario");
  return SIN_ERROR;
}

export async function registrarMovimiento(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const insumoId = Number(datos.get("insumoId"));
  const tipo = String(datos.get("tipo") ?? "");
  const cantidadCruda = Number(datos.get("cantidad"));
  const motivo = String(datos.get("motivo") ?? "").trim() || null;

  if (tipo !== "entrada" && tipo !== "ajuste") return { error: "Elegí un tipo de movimiento." };
  if (!Number.isFinite(cantidadCruda) || cantidadCruda === 0) {
    return { error: "La cantidad no puede ser cero." };
  }

  // Una "entrada" siempre suma; el signo de un "ajuste" lo elige quien carga
  // (puede corregir para arriba o para abajo).
  const cantidad = tipo === "entrada" ? Math.abs(cantidadCruda) : cantidadCruda;

  const supabase = await clienteServidor();
  const { error } = await supabase.rpc("registrar_movimiento_insumo", {
    p_insumo_id: insumoId,
    p_tipo: tipo,
    p_cantidad: cantidad,
    p_motivo: motivo,
  });

  if (error) return { error: "No se pudo registrar el movimiento." };

  revalidatePath("/inventario");
  return SIN_ERROR;
}
```

- [ ] **Step 3: Escribir `componentes/FormularioInsumo.tsx`**

```tsx
"use client";

import { Boton } from "@/componentes/Boton";
import { Campo } from "@/componentes/Campo";
import { useAccionConReset } from "@/lib/useAccionConReset";
import { crearInsumo } from "../consultas/acciones";

const INICIAL = { error: null };

export function FormularioInsumo() {
  const { estado, accion, enviando, formRef } = useAccionConReset(crearInsumo, INICIAL);

  return (
    <form ref={formRef} action={accion} className="flex flex-wrap items-end gap-2">
      <Campo id="nombre-insumo" name="nombre" etiqueta="Insumo nuevo" required />
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold tracking-wide text-texto-suave uppercase">
          Unidad
        </span>
        <select
          name="unidad"
          required
          defaultValue=""
          className="rounded-(--r) border border-linea bg-superficie px-3 py-2 text-sm"
        >
          <option value="" disabled>
            Elegir
          </option>
          <option value="u">Unidad</option>
          <option value="kg">Kilo</option>
        </select>
      </label>
      <Campo id="minimo-insumo" name="minimo" etiqueta="Mínimo" type="number" min="0" required />
      <Campo id="costo-insumo" name="costo" etiqueta="Costo" type="number" min="0" required />
      <Boton type="submit" disabled={enviando}>
        {enviando ? "Creando…" : "Agregar"}
      </Boton>
      {estado.error && (
        <p role="alert" className="text-sm text-alerta">
          {estado.error}
        </p>
      )}
    </form>
  );
}
```

- [ ] **Step 4: Escribir `componentes/FormularioMovimiento.tsx`**

```tsx
"use client";

import { useAccionConReset } from "@/lib/useAccionConReset";
import { registrarMovimiento } from "../consultas/acciones";

const INICIAL = { error: null };

export function FormularioMovimiento({ insumoId }: { insumoId: number }) {
  const { estado, accion, enviando, formRef } = useAccionConReset(registrarMovimiento, INICIAL);

  return (
    <form ref={formRef} action={accion} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="insumoId" value={insumoId} />
      <select
        name="tipo"
        required
        defaultValue="entrada"
        className="rounded-(--r) border border-linea bg-superficie px-2 py-1 text-xs"
      >
        <option value="entrada">Entrada</option>
        <option value="ajuste">Ajuste</option>
      </select>
      <input
        type="number"
        name="cantidad"
        step="0.1"
        required
        aria-label="Cantidad"
        placeholder="cantidad"
        className="numero w-20 rounded-(--r) border border-linea bg-superficie px-2 py-1 text-xs"
      />
      <input
        type="text"
        name="motivo"
        placeholder="motivo (opcional)"
        aria-label="Motivo"
        className="rounded-(--r) border border-linea bg-superficie px-2 py-1 text-xs"
      />
      <button type="submit" disabled={enviando} className="text-xs underline opacity-70">
        {enviando ? "Guardando…" : "Registrar"}
      </button>
      {estado.error && (
        <span role="alert" className="text-xs text-alerta">
          {estado.error}
        </span>
      )}
    </form>
  );
}
```

- [ ] **Step 5: Escribir `componentes/SeccionInsumos.tsx`**

```tsx
import { listarInsumos } from "../consultas/insumos";
import { FormularioInsumo } from "./FormularioInsumo";
import { FormularioMovimiento } from "./FormularioMovimiento";

const ETIQUETA_UNIDAD: Record<string, string> = { u: "u", kg: "kg" };

export async function SeccionInsumos({ esDuenio }: { esDuenio: boolean }) {
  const insumos = await listarInsumos();

  return (
    <section className="flex flex-col gap-4 rounded-(--r-grande) border border-linea bg-superficie p-6">
      <header>
        <h2 className="font-display text-lg font-semibold">Insumos</h2>
        <p className="text-sm text-texto-suave">Cucuruchos, potes vacíos, salsas.</p>
      </header>

      <table className="w-full text-left text-sm">
        <thead className="border-b border-linea text-xs text-texto-suave uppercase">
          <tr>
            <th className="p-2">Insumo</th>
            <th className="p-2">Código</th>
            <th className="p-2">Stock</th>
            <th className="p-2">Registrar movimiento</th>
          </tr>
        </thead>
        <tbody>
          {insumos.map((insumo) => (
            <tr key={insumo.id} className="border-b border-linea last:border-0">
              <td className="p-2">{insumo.nombre}</td>
              <td className="numero p-2">{insumo.codigo}</td>
              <td className="numero p-2">
                {insumo.cantidad} {ETIQUETA_UNIDAD[insumo.unidad]}
              </td>
              <td className="p-2">
                <FormularioMovimiento insumoId={insumo.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {esDuenio && <FormularioInsumo />}
    </section>
  );
}
```

- [ ] **Step 6: Verificar y commitear**

```bash
npm run verificar
git add src/modulos/inventario/consultas/insumos.ts src/modulos/inventario/consultas/acciones.ts src/modulos/inventario/componentes/FormularioInsumo.tsx src/modulos/inventario/componentes/FormularioMovimiento.tsx src/modulos/inventario/componentes/SeccionInsumos.tsx
git commit -m "Agregar Insumos: catálogo y registro de movimientos"
```

Con las dos funciones de este task, `acciones.ts` queda cerca de 90 líneas —
todavía lejos del límite. Igual, correr `wc -l` sobre el archivo después de
cada task que lo toque: el límite de 200 líneas de AGENTS.md corta, no es
sugerencia. Si en el Task 7 se pasa, dividirlo ahí (por ejemplo
`accionesBaldes.ts` separado) antes de seguir.

---

### Task 7: Baldes — consultas, acciones y UI (con la alerta)

**Files:**
- Create: `src/modulos/inventario/consultas/baldes.ts`
- Modify: `src/modulos/inventario/consultas/acciones.ts` (agregar `darDeAltaBalde`, `abrirBalde`)
- Create: `src/modulos/inventario/componentes/FormularioBalde.tsx`
- Create: `src/modulos/inventario/componentes/BotonAbrirBalde.tsx`
- Create: `src/modulos/inventario/componentes/SeccionBaldes.tsx`

**Interfaces:**
- Consumes: `Balde`, `EstadoBalde`, `Sabor` de `../tipos` (Task 3); `saborEnAlerta` de `../alerta` (Task 4); `listarSabores` de `./sabores` (Task 5); `obtenerConfigComercio` de `@/lib/configComercio` (Task 2); `useAccionConReset` de `@/lib/useAccionConReset` (Task 5); `generarCodigo` de `@/lib/codigos/codigo`; RPC `siguiente_numero_balde()` (Task 1).
- Produces: `listarBaldes(): Promise<Balde[]>`; Server Actions `darDeAltaBalde`, `abrirBalde`; `<SeccionBaldes />`, usado por `page.tsx` en el Task 8.

- [ ] **Step 1: Escribir `consultas/baldes.ts`**

```typescript
import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { Balde, EstadoBalde } from "../tipos";

type FilaBalde = {
  id: number;
  codigo: string;
  sabor_id: number;
  kg_inicial: string;
  kg_restante: string;
  estado: EstadoBalde;
  costo: number;
  costo_envase: number;
};

function mapearBalde(fila: FilaBalde): Balde {
  return {
    id: fila.id,
    codigo: fila.codigo,
    saborId: fila.sabor_id,
    kgInicial: Number(fila.kg_inicial),
    kgRestante: Number(fila.kg_restante),
    estado: fila.estado,
    costo: fila.costo,
    costoEnvase: fila.costo_envase,
  };
}

/** Baldes vivos en el circuito (no vendidos/canjeados): lo que importa ver a diario. */
export async function listarBaldes(): Promise<Balde[]> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("baldes")
    .select("id, codigo, sabor_id, kg_inicial, kg_restante, estado, costo, costo_envase")
    .in("estado", ["cerrado", "abierto"])
    .order("entro_en");

  return ((data as FilaBalde[] | null) ?? []).map(mapearBalde);
}
```

- [ ] **Step 2: Agregar a `consultas/acciones.ts`**

```typescript
export async function darDeAltaBalde(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const saborId = Number(datos.get("saborId"));
  const kgInicial = Number(datos.get("kgInicial"));
  const costo = Number(datos.get("costo"));
  const costoEnvase = Number(datos.get("costoEnvase"));

  if (!Number.isInteger(saborId)) return { error: "Elegí un sabor." };
  if (!Number.isFinite(kgInicial) || kgInicial <= 0) {
    return { error: "El peso inicial tiene que ser mayor a cero." };
  }
  if (
    !Number.isInteger(costo) ||
    costo < 0 ||
    !Number.isInteger(costoEnvase) ||
    costoEnvase < 0
  ) {
    return { error: "Costo y costo de envase tienen que ser números enteros positivos." };
  }

  const supabase = await clienteServidor();
  const { data: numero, error: errorSecuencia } = await supabase.rpc("siguiente_numero_balde");
  if (errorSecuencia || numero === null) return { error: "No se pudo generar el código." };

  const codigo = generarCodigo("B", numero);
  const { error } = await supabase.from("baldes").insert({
    codigo,
    sabor_id: saborId,
    kg_inicial: kgInicial,
    kg_restante: kgInicial,
    costo,
    costo_envase: costoEnvase,
  });

  if (error) return { error: "No se pudo dar de alta el balde." };

  revalidatePath("/inventario");
  return SIN_ERROR;
}

export async function abrirBalde(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const baldeId = Number(datos.get("baldeId"));

  const supabase = await clienteServidor();
  const { error, count } = await supabase
    .from("baldes")
    .update({ estado: "abierto" }, { count: "exact" })
    .eq("id", baldeId)
    .eq("estado", "cerrado");

  if (error) {
    if (error.code === "23505") return { error: "Ya hay un balde abierto de ese sabor." };
    return { error: "No se pudo abrir el balde." };
  }
  if (!count) return { error: "Ese balde ya no está cerrado." };

  revalidatePath("/inventario");
  return SIN_ERROR;
}
```

- [ ] **Step 3: Escribir `componentes/FormularioBalde.tsx`**

```tsx
"use client";

import { Boton } from "@/componentes/Boton";
import { Campo } from "@/componentes/Campo";
import { useAccionConReset } from "@/lib/useAccionConReset";
import type { Sabor } from "../tipos";
import { darDeAltaBalde } from "../consultas/acciones";

const INICIAL = { error: null };

export function FormularioBalde({ sabores }: { sabores: Sabor[] }) {
  const { estado, accion, enviando, formRef } = useAccionConReset(darDeAltaBalde, INICIAL);

  return (
    <form ref={formRef} action={accion} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold tracking-wide text-texto-suave uppercase">
          Sabor
        </span>
        <select
          name="saborId"
          required
          className="rounded-(--r) border border-linea bg-superficie px-3 py-2 text-sm"
        >
          {sabores.map((sabor) => (
            <option key={sabor.id} value={sabor.id}>
              {sabor.nombre}
            </option>
          ))}
        </select>
      </label>
      <Campo
        id="kg-inicial"
        name="kgInicial"
        etiqueta="Kg"
        type="number"
        step="0.1"
        min="0.1"
        required
      />
      <Campo id="costo-balde" name="costo" etiqueta="Costo" type="number" min="0" required />
      <Campo
        id="costo-envase"
        name="costoEnvase"
        etiqueta="Costo envase"
        type="number"
        min="0"
        required
      />
      <Boton type="submit" disabled={enviando}>
        {enviando ? "Guardando…" : "Dar de alta"}
      </Boton>
      {estado.error && (
        <p role="alert" className="text-sm text-alerta">
          {estado.error}
        </p>
      )}
    </form>
  );
}
```

- [ ] **Step 4: Escribir `componentes/BotonAbrirBalde.tsx`**

```tsx
"use client";

import { useActionState } from "react";
import { abrirBalde } from "../consultas/acciones";

const INICIAL = { error: null };

export function BotonAbrirBalde({ baldeId }: { baldeId: number }) {
  const [estado, accion, enviando] = useActionState(abrirBalde, INICIAL);

  return (
    <form action={accion} className="flex items-center gap-2">
      <input type="hidden" name="baldeId" value={baldeId} />
      <button
        type="submit"
        disabled={enviando}
        className="rounded-(--r) bg-acento px-2 py-1 text-xs font-semibold text-acento-texto disabled:opacity-45"
      >
        {enviando ? "Abriendo…" : "Abrir"}
      </button>
      {estado.error && (
        <span role="alert" className="text-xs text-alerta">
          {estado.error}
        </span>
      )}
    </form>
  );
}
```

- [ ] **Step 5: Escribir `componentes/SeccionBaldes.tsx`**

```tsx
import { obtenerConfigComercio } from "@/lib/configComercio";
import { saborEnAlerta } from "../alerta";
import { listarBaldes } from "../consultas/baldes";
import { listarSabores } from "../consultas/sabores";
import { BotonAbrirBalde } from "./BotonAbrirBalde";
import { FormularioBalde } from "./FormularioBalde";

const ETIQUETA_ESTADO: Record<string, string> = {
  cerrado: "Cerrado",
  abierto: "Abierto",
};

export async function SeccionBaldes() {
  const [sabores, baldes, config] = await Promise.all([
    listarSabores(),
    listarBaldes(),
    obtenerConfigComercio(),
  ]);
  const saboresActivos = sabores.filter((sabor) => sabor.activo);

  return (
    <section className="flex flex-col gap-4 rounded-(--r-grande) border border-linea bg-superficie p-6">
      <header>
        <h2 className="font-display text-lg font-semibold">Baldes</h2>
        <p className="text-sm text-texto-suave">
          Cada balde es una unidad: puede haber varios del mismo sabor a la vez.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        {saboresActivos.map((sabor) => {
          const deEsteSabor = baldes.filter((balde) => balde.saborId === sabor.id);
          const abierto = deEsteSabor.find((balde) => balde.estado === "abierto") ?? null;
          const enAlerta = saborEnAlerta(sabor, abierto, config.stockMinimoDefault);

          return (
            <div key={sabor.id} className="rounded-(--r) border border-linea p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="font-semibold">{sabor.nombre}</span>
                {enAlerta && (
                  <span className="rounded-(--r) bg-alerta-fondo px-2 py-0.5 text-xs text-alerta">
                    {abierto ? "Se está por acabar" : "Sin balde abierto"}
                  </span>
                )}
              </div>

              {deEsteSabor.length === 0 ? (
                <p className="text-sm text-texto-suave">Sin baldes en stock.</p>
              ) : (
                <ul className="flex flex-col gap-1 text-sm">
                  {deEsteSabor.map((balde) => (
                    <li key={balde.id} className="flex items-center gap-3">
                      <span className="numero">{balde.codigo}</span>
                      <span>{ETIQUETA_ESTADO[balde.estado]}</span>
                      <span className="numero">{balde.kgRestante} kg</span>
                      {balde.estado === "cerrado" && <BotonAbrirBalde baldeId={balde.id} />}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <FormularioBalde sabores={saboresActivos} />
    </section>
  );
}
```

- [ ] **Step 6: Verificar y commitear**

```bash
npm run verificar
git add src/modulos/inventario/consultas/baldes.ts src/modulos/inventario/consultas/acciones.ts src/modulos/inventario/componentes/FormularioBalde.tsx src/modulos/inventario/componentes/BotonAbrirBalde.tsx src/modulos/inventario/componentes/SeccionBaldes.tsx
git commit -m "Agregar Baldes: alta, apertura y alerta de mínimo"
```

---

### Task 8: Página `/inventario` y navegación

**Files:**
- Create: `src/app/(app)/inventario/page.tsx`
- Modify: `src/config/navegacion.ts`

**Interfaces:**
- Consumes: `exigirPerfil` de `@/modulos/auth/consultas/perfil`; `SeccionSabores`, `SeccionBaldes`, `SeccionInsumos` (Tasks 5, 6, 7).
- Produces: la ruta `/inventario`, visible en el menú para ambos roles.

- [ ] **Step 1: Escribir `src/app/(app)/inventario/page.tsx`**

```tsx
import { exigirPerfil } from "@/modulos/auth/consultas/perfil";
import { SeccionBaldes } from "@/modulos/inventario/componentes/SeccionBaldes";
import { SeccionInsumos } from "@/modulos/inventario/componentes/SeccionInsumos";
import { SeccionSabores } from "@/modulos/inventario/componentes/SeccionSabores";

export const metadata = { title: "Inventario" };

export default async function Inventario() {
  const perfil = await exigirPerfil();
  const esDuenio = perfil.rol === "duenio";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold">Inventario</h1>
        <p className="text-texto-suave">Sabores, baldes e insumos.</p>
      </header>

      <SeccionSabores esDuenio={esDuenio} />
      <SeccionBaldes />
      <SeccionInsumos esDuenio={esDuenio} />
    </div>
  );
}
```

- [ ] **Step 2: Agregar la entrada de menú en `src/config/navegacion.ts`**

Buscar:

```typescript
export const MODULOS: readonly Modulo[] = [
  { href: "/inicio", etiqueta: "Inicio", icono: "🍦", roles: TODOS },
  { href: "/codigos", etiqueta: "Códigos", icono: "🏷️", roles: TODOS },
  { href: "/usuarios", etiqueta: "Usuarios", icono: "👥", roles: SOLO_DUENIO },
];
```

Reemplazar por:

```typescript
export const MODULOS: readonly Modulo[] = [
  { href: "/inicio", etiqueta: "Inicio", icono: "🍦", roles: TODOS },
  { href: "/inventario", etiqueta: "Inventario", icono: "📦", roles: TODOS },
  { href: "/codigos", etiqueta: "Códigos", icono: "🏷️", roles: TODOS },
  { href: "/usuarios", etiqueta: "Usuarios", icono: "👥", roles: SOLO_DUENIO },
];
```

- [ ] **Step 3: Verificar y commitear**

```bash
npm run verificar
git add src/app/\(app\)/inventario/page.tsx src/config/navegacion.ts
git commit -m "Agregar página de Inventario y su entrada de menú"
```

---

### Task 9: `rls.test.ts` del módulo Inventario

**Files:**
- Create: `src/modulos/inventario/rls.test.ts`

**Interfaces:**
- Consumes: tablas y función RPC de Task 1, vía `@supabase/supabase-js` directo (no los helpers de Next.js — este test corre en Node, sin request context).
- Produces: nada que otra tarea consuma; es la red de seguridad del módulo.

- [ ] **Step 1: Escribir el archivo**

```typescript
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Corre contra un proyecto Supabase de PRUEBA, nunca el real: crea usuarios y
 * filas descartables con la clave de servicio, prueba con la clave pública, y
 * limpia todo en afterAll. Excluido de `npm run test:unit` por el glob de
 * package.json — solo lo corre el job `seguridad` de CI cuando existe
 * `SUPABASE_PRUEBAS` (ver .github/workflows/ci.yml).
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const clavePublica = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const claveServicio = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const servicio = createClient(url, claveServicio);

async function crearUsuarioDePrueba(rol: "duenio" | "colaborador") {
  const usuario = `test-${rol}-${Date.now()}`;
  const email = `${usuario}@heladeria.local`;
  const password = "prueba-123456";

  const { data, error } = await servicio.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw error;

  if (rol === "duenio") {
    await servicio.from("perfiles").update({ rol: "duenio" }).eq("id", data.user.id);
  }

  const cliente = createClient(url, clavePublica);
  const { error: errorIngreso } = await cliente.auth.signInWithPassword({ email, password });
  if (errorIngreso) throw errorIngreso;

  return { id: data.user.id, cliente };
}

describe("RLS: inventario", () => {
  let duenio: Awaited<ReturnType<typeof crearUsuarioDePrueba>>;
  let colaborador: Awaited<ReturnType<typeof crearUsuarioDePrueba>>;
  let anonimo: ReturnType<typeof createClient>;
  let saborId: number;
  let insumoId: number;

  beforeAll(async () => {
    duenio = await crearUsuarioDePrueba("duenio");
    colaborador = await crearUsuarioDePrueba("colaborador");
    anonimo = createClient(url, clavePublica);

    const { data: sabor } = await servicio
      .from("sabores")
      .insert({ nombre: `Sabor de prueba ${Date.now()}` })
      .select("id")
      .single();
    saborId = sabor!.id;

    const { data: insumo } = await servicio
      .from("insumos")
      .insert({
        nombre: `Insumo de prueba ${Date.now()}`,
        codigo: `GA${String(Date.now()).slice(-7)}`,
        unidad: "u",
        minimo: 1,
        costo: 100,
      })
      .select("id")
      .single();
    insumoId = insumo!.id;
  });

  afterAll(async () => {
    await servicio.from("insumos").delete().eq("id", insumoId);
    await servicio.from("sabores").delete().eq("id", saborId);
    await servicio.auth.admin.deleteUser(duenio.id);
    await servicio.auth.admin.deleteUser(colaborador.id);
  });

  it("sin sesión no se puede leer sabores", async () => {
    const { data, error } = await anonimo.from("sabores").select("id");
    expect(data).toEqual([]);
    expect(error).toBeNull();
  });

  it("un colaborador no puede crear un sabor", async () => {
    const { error } = await colaborador.cliente
      .from("sabores")
      .insert({ nombre: "Sabor de colaborador" });
    expect(error).not.toBeNull();
  });

  it("un colaborador no puede editar el costo de un insumo", async () => {
    await colaborador.cliente.from("insumos").update({ costo: 999 }).eq("id", insumoId);
    const { data } = await servicio.from("insumos").select("costo").eq("id", insumoId).single();
    expect(data!.costo).toBe(100);
  });

  it("un colaborador no puede insertar directo en movimientos_insumo", async () => {
    const { error } = await colaborador.cliente
      .from("movimientos_insumo")
      .insert({ insumo_id: insumoId, tipo: "entrada", cantidad: 5, creado_por: colaborador.id });
    expect(error).not.toBeNull();
  });

  it("un colaborador sí puede registrar un movimiento por la función", async () => {
    const { error } = await colaborador.cliente.rpc("registrar_movimiento_insumo", {
      p_insumo_id: insumoId,
      p_tipo: "entrada",
      p_cantidad: 5,
      p_motivo: "prueba",
    });
    expect(error).toBeNull();
  });

  it("un colaborador sí puede dar de alta un balde", async () => {
    const { data, error } = await colaborador.cliente
      .from("baldes")
      .insert({
        codigo: `GB${String(Date.now()).slice(-7)}`,
        sabor_id: saborId,
        kg_inicial: 9,
        kg_restante: 9,
        costo: 1000,
        costo_envase: 500,
      })
      .select("id")
      .single();
    expect(error).toBeNull();

    await servicio.from("baldes").delete().eq("id", data!.id);
  });

  it("no se puede abrir dos baldes del mismo sabor a la vez", async () => {
    const { data: baldeA } = await servicio
      .from("baldes")
      .insert({
        codigo: `GB${String(Date.now()).slice(-7)}`,
        sabor_id: saborId,
        kg_inicial: 9,
        kg_restante: 9,
        estado: "abierto",
        costo: 1000,
        costo_envase: 500,
      })
      .select("id")
      .single();

    const { data: baldeB } = await servicio
      .from("baldes")
      .insert({
        codigo: `GB${String(Date.now() + 1).slice(-7)}`,
        sabor_id: saborId,
        kg_inicial: 9,
        kg_restante: 9,
        costo: 1000,
        costo_envase: 500,
      })
      .select("id")
      .single();

    const { error } = await colaborador.cliente
      .from("baldes")
      .update({ estado: "abierto" })
      .eq("id", baldeB!.id);

    expect(error).not.toBeNull();

    await servicio.from("baldes").delete().in("id", [baldeA!.id, baldeB!.id]);
  });
});
```

- [ ] **Step 2: Confirmar que queda excluido del run normal**

Run: `npm run test:unit`
Expected: el archivo `rls.test.ts` no aparece en la lista de test files
corridos (el `--exclude "**/*.rls.test.ts"` de `package.json` ya lo filtra).

- [ ] **Step 3: Verificar y commitear**

```bash
npm run verificar
git add src/modulos/inventario/rls.test.ts
git commit -m "Agregar rls.test.ts de Inventario (no corre en CI todavía)"
```

---

### Task 10: Verificación manual end-to-end

**Files:** ninguno (solo verificación manual + un último ajuste de checklist)

**Interfaces:** ninguna — cierra la fase.

Este paso no lo hace un agente solo: necesita que una persona con acceso al
proyecto de Supabase real aplique la migración a mano, igual que se hizo con
Núcleo.

- [ ] **Step 1: Pedirle al usuario que aplique la migración**

Mensaje para el usuario: "Abrí el SQL Editor de tu proyecto en supabase.com,
pegá el contenido completo de
`supabase/migrations/20260919130000_inventario.sql`, y ejecutalo."

- [ ] **Step 2: Confirmar y actualizar el checklist**

Una vez que el usuario confirme que corrió sin errores, en
`supabase/README.md` cambiar:

```markdown
| `20260919130000_inventario.sql`| ⬜       |
```

por:

```markdown
| `20260919130000_inventario.sql`| ✅       |
```

Y en `ROADMAP.md`, en la fila de Fase 2, sacar la anotación
`← _escrito, falta aplicar la migración_`.

- [ ] **Step 3: Probar el entregable de la fase en el navegador**

Con `npm run dev` corriendo y sesión iniciada como `goro` (dueño):

1. Ir a "Inventario". Crear el sabor "Frutilla" (si no existe).
2. En la sección Baldes, dar de alta dos baldes de Frutilla (ej. 9 kg, costo
   8000, costo envase 1500 cada uno).
3. Abrir uno de los dos. Confirmar que el otro sigue "Cerrado" y que no
   aparece ningún error al abrir el primero.
4. Intentar abrir el segundo balde de Frutilla también: tiene que fallar con
   "Ya hay un balde abierto de ese sabor" (confirma el índice único parcial).
5. En Sabores, ponerle a Frutilla un mínimo de, por ejemplo, `8.5` (por
   encima de los ~9 kg que trae el balde recién abierto).
6. Volver a Baldes: Frutilla tiene que mostrar la pastilla de alerta ("Se
   está por acabar"), mientras que cualquier otro sabor con un balde recién
   abierto (mínimo por defecto 2,5) no la muestra.
7. Iniciar sesión como un usuario con rol `colaborador` y confirmar: no ve
   el formulario para crear sabores ni insumos nuevos, pero sí puede dar de
   alta un balde y registrar un movimiento de insumo.

- [ ] **Step 4: Commitear la actualización del checklist**

```bash
git add supabase/README.md ROADMAP.md
git commit -m "Marcar la migración de Inventario como aplicada"
```

Con este paso, Fase 2 queda cerrada: el entregable del ROADMAP ("Entran dos
baldes de Frutilla; se abre uno y el otro queda entero. Goro le pone a
Frutilla un mínimo distinto que al resto y la alerta salta antes solo ahí")
es verificable de punta a punta.
