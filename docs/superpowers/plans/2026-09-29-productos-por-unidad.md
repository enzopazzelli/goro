# Productos por unidad, conos y formatos "sin helado" — Plan de implementación

> **Para quien ejecute:** REQUIRED SUB-SKILL: usar superpowers:subagent-driven-development (recomendado si las tareas se reparten) o superpowers:executing-plans. Los pasos usan checkbox (`- [ ]`).

**Objetivo:** vender por unidad y por docena productos sin sabor (bombón, palito, conos sueltos…), y que cada formato con helado descuente su cono del stock, con anulación que devuelve todo.

**Arquitectura:** se extiende `insumos` (ya tiene stock, mínimo, costo, código `GA` y ledger) con una tabla de **presentaciones** (x1, x12, cada una con su precio) y una tabla `formato_insumos` (qué consume cada formato). `venta_items` apunta a un formato **o** a una presentación. `registrar_venta` sigue siendo una sola transacción y se parte en dos funciones auxiliares internas.

**Stack:** Next.js 16 (App Router, server actions), Supabase (Postgres + RLS), Vitest.

**Spec:** [`docs/superpowers/specs/2026-09-29-productos-por-unidad-design.md`](../specs/2026-09-29-productos-por-unidad-design.md)

## Global Constraints

Copiadas de `AGENTS.md` y del spec; valen para todas las tareas.

- Todo en español: archivos, funciones, variables, columnas, mensajes. Los comentarios explican el **por qué**.
- **200 líneas por archivo y 100 por función** (ESLint, sin contar comentarios ni blancos); complejidad ≤ 12; los tests admiten hasta 400 líneas por archivo.
- **Un `#hex` solo en `src/estilos/tema.css`.** Se usan las clases de token que ya usa el código (`text-alerta`, `border-linea`, `text-texto-suave`…).
- Un módulo **no importa de las `consultas/` de otro**; lo compartido va a `src/lib/`. Un `import type` desde `@/lib/...` está bien.
- **Una operación de negocio = una transacción del lado del servidor.** El stock nunca se pisa: siempre se suma un movimiento. "Solo uno" vive en un índice único. Toda validación de negocio existe también como `check`.
- En funciones `security definer`, el rol se compara con `coalesce(auth_rol() = 'duenio', false)`; la sesión activa con `coalesce(public.auth_rol() is not null, false)`.
- Las funciones internas se cierran con `revoke execute ... from public, anon, authenticated`.
- **Migraciones aditivas y nunca se edita una ya aplicada.** No hay staging ni Docker: se aplican a mano en el SQL Editor de Supabase, primero en el proyecto de **PRUEBAS**. Los valores nuevos de un `enum` van en una migración **aparte** (Postgres no deja usarlos en la misma transacción que los agrega).
- **Stock insuficiente no bloquea la venta**: queda negativo con alerta visible (decisión de Goro).
- Los precios los completa Goro después: todo se carga **inactivo y sin precio**.
- **Commits sin la línea `Co-Authored-By`** (regla del usuario, aunque el entorno la pida).
- Antes de dar algo por terminado: `npm run verificar` (formato, lint, typecheck y tests unitarios). Los `rls.test.ts` **no** entran ahí: se corren a mano contra pruebas.
- `AGENTS.md` avisa que este Next.js tiene cambios de API: si una tarea se aparta de los patrones que ya usa el repo (server actions con `useActionState`, `revalidatePath`), leer antes la guía en `node_modules/next/dist/docs/`.

## Review Focus

Entradas que el spec no nombra y que una persona usando esto puede tocar. Cada línea tiene su test en la tarea que se indica.

1. **Un cono (insumo) desactivado no frena la venta de un formato.** Se vende igual y el stock baja. → Tarea 3.
2. **Anular dos veces la misma venta** da error y **no** devuelve el stock dos veces. → Tarea 3.
3. **`presentacion_id` inexistente**: error claro y ninguna venta queda a medias (rollback total). → Tarea 3.
4. **Unidades o precio que no son enteros** (`12,5`, `abc`, vacío) se rechazan en el formulario de presentaciones. → Tarea 6.
5. **Ticket mezclado** (un formato con sabores y una docena de producto) suma bien el total y manda cada ítem con su forma. → Tarea 4.

## Decisiones que el plan toma y el spec no fijaba

- `formato_insumos.formato_id` lleva `on delete cascade`: es configuración, no historial, y sin eso el botón "Borrar formato" fallaría con un mensaje engañoso ("¿tiene ventas asociadas?").
- El dueño puede **borrar** filas de `formato_insumos` (quitar un consumo). Las presentaciones, en cambio, nunca se borran.
- `formato_insumos` otorga `update` sobre las tres columnas: el `upsert` de PostgREST reescribe todas las que envía.
- Módulo nuevo `src/modulos/presentaciones/` para la edición de presentaciones (con su `rls.test.ts`); el listado que necesitan Stock y el mostrador vive en `src/lib/presentaciones.ts`.
- Los ítems del carrito pasan a ser una unión con `tipo: "formato" | "producto"`, en vez de campos opcionales.
- **Supuestos a confirmar con Goro** (se cargan como están y se corrigen desde Stock, sin código): hay cinco conos distintos (simple, doble, canasta, dulce, cucuruchón dulce); el vasito simple no consume ningún cono.

## Fuera de alcance

Baldes de 10 L y 5 L (hoy el balde solo lleva `kg_inicial`; falta decidir cómo se guarda el tamaño), térmicos de ¼, ½ y 1 kg (ya existen como formatos), descuento del helado del vasito de 100 g, escaneo con pistola. **Decisión abierta:** hoy un formato puede estar activo a $0 (el `check` de `formatos` solo pide `precio >= 0`); las presentaciones ya lo impiden, los formatos no.

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `supabase/migrations/20260929100000_presentaciones_insumo.sql` | Tabla, índice único, checks y RLS de presentaciones |
| `supabase/migrations/20260929110000_formato_insumos.sql` | Tabla y RLS de "qué consume cada formato" |
| `supabase/migrations/20260929120000_tipos_movimiento_venta.sql` | Solo los dos valores nuevos del enum |
| `supabase/migrations/20260929130000_venta_de_productos.sql` | `venta_items`, movimientos, funciones de cobro y anulación |
| `supabase/carga_productos_goro.sql` | Carga inicial de las dos listas (script aparte, como `seed_ejemplo.sql`) |
| `src/lib/presentaciones.ts` | Tipo `Presentacion` y `listarPresentaciones()` (compartido Stock/mostrador) |
| `src/modulos/presentaciones/validacion.ts` | Validación pura de una presentación |
| `src/modulos/presentaciones/consultas/acciones.ts` | Acciones de servidor: crear y editar |
| `src/modulos/presentaciones/componentes/*` | `PresentacionesInsumo`, `FilaPresentacion`, `FormularioPresentacion` |
| `src/modulos/presentaciones/rls.test.ts` | Qué NO puede hacer cada rol sobre las dos tablas nuevas |
| `src/modulos/ventas/ticket.ts` | Lógica pura del ticket: payload al servidor, total, sabores |
| `src/modulos/ventas/nombreItem.ts` | Nombre de un ítem vendido (formato o producto) |
| `src/modulos/ventas/componentes/SelectorDeProductos.tsx` | Botones de productos en el mostrador |
| `src/modulos/inventario/componentes/ConsumoFormato.tsx` | Editor de "consume" de un formato |

---

### Task 1: Presentaciones de insumo (tabla + RLS)

**Files:**
- Create: `src/modulos/presentaciones/rls.test.ts`
- Create: `supabase/migrations/20260929100000_presentaciones_insumo.sql`

**Interfaces:**
- Consumes: `insumos`, `es_duenio()`, `auth_rol()` (ya existen).
- Produces: tabla `public.presentaciones_insumo (id, insumo_id, nombre, unidades, precio, activo, creado_en)`; índice único `(insumo_id, unidades)`; solo el dueño inserta/edita; nadie borra.

- [ ] **Step 0: Confirmar contra qué proyecto se van a correr los tests**

Los `rls.test.ts` **crean usuarios y filas reales** en el proyecto de `.env.local`. Leé `NEXT_PUBLIC_SUPABASE_URL` en `.env.local` (sin imprimir claves) y confirmá con Enzo que es el proyecto de **PRUEBAS**. Si es el real, parar acá.

- [ ] **Step 1: Escribir el test que falla**

Crear `src/modulos/presentaciones/rls.test.ts`:

```ts
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Corre contra un proyecto Supabase de PRUEBA, nunca el real — mismo criterio
 * que src/modulos/inventario/rls.test.ts. Excluido de `npm run test:unit`.
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

/** Código GA + 7 dígitos al azar: dos archivos de test corren en paralelo y no pueden chocar. */
function codigoDePrueba() {
  return `GA${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
}

describe("RLS: presentaciones de insumo", () => {
  let duenio: Awaited<ReturnType<typeof crearUsuarioDePrueba>>;
  let colaborador: Awaited<ReturnType<typeof crearUsuarioDePrueba>>;
  let anonimo: ReturnType<typeof createClient>;
  let insumoId: number;
  let presentacionId: number;

  beforeAll(async () => {
    duenio = await crearUsuarioDePrueba("duenio");
    colaborador = await crearUsuarioDePrueba("colaborador");
    anonimo = createClient(url, clavePublica);

    const { data: insumo } = await servicio
      .from("insumos")
      .insert({
        nombre: `Producto de prueba ${Date.now()}`,
        codigo: codigoDePrueba(),
        unidad: "u",
        minimo: 0,
        costo: 0,
      })
      .select("id")
      .single();
    insumoId = insumo!.id;

    const { data: presentacion } = await servicio
      .from("presentaciones_insumo")
      .insert({ insumo_id: insumoId, nombre: "Unidad", unidades: 1, precio: 1000, activo: true })
      .select("id")
      .single();
    presentacionId = presentacion!.id;
  });

  afterAll(async () => {
    await servicio.from("presentaciones_insumo").delete().eq("insumo_id", insumoId);
    await servicio.from("insumos").delete().eq("id", insumoId);
    await servicio.auth.admin.deleteUser(duenio.id);
    await servicio.auth.admin.deleteUser(colaborador.id);
  });

  it("sin sesión no se pueden leer las presentaciones", async () => {
    const { data, error } = await anonimo.from("presentaciones_insumo").select("id");
    expect(data).toEqual([]);
    expect(error).toBeNull();
  });

  it("un colaborador las lee", async () => {
    const { data } = await colaborador.cliente
      .from("presentaciones_insumo")
      .select("id")
      .eq("id", presentacionId);
    expect(data).toHaveLength(1);
  });

  it("un colaborador no puede crear una presentación", async () => {
    const { error } = await colaborador.cliente
      .from("presentaciones_insumo")
      .insert({ insumo_id: insumoId, nombre: "Docena", unidades: 12 });
    expect(error).not.toBeNull();
  });

  it("un colaborador no puede cambiar el precio", async () => {
    await colaborador.cliente
      .from("presentaciones_insumo")
      .update({ precio: 1 })
      .eq("id", presentacionId);
    const { data } = await servicio
      .from("presentaciones_insumo")
      .select("precio")
      .eq("id", presentacionId)
      .single();
    expect(data!.precio).toBe(1000);
  });

  it("el dueño crea una presentación inactiva y sin precio", async () => {
    const { error } = await duenio.cliente
      .from("presentaciones_insumo")
      .insert({ insumo_id: insumoId, nombre: "Docena", unidades: 12 });
    expect(error).toBeNull();
  });

  it("no puede haber dos presentaciones con las mismas unidades del mismo insumo", async () => {
    const { error } = await duenio.cliente
      .from("presentaciones_insumo")
      .insert({ insumo_id: insumoId, nombre: "Otra docena", unidades: 12 });
    expect(error?.code).toBe("23505");
  });

  it("una presentación no puede quedar activa a $0", async () => {
    const { error } = await duenio.cliente
      .from("presentaciones_insumo")
      .insert({ insumo_id: insumoId, nombre: "Caja", unidades: 24, precio: 0, activo: true });
    expect(error?.code).toBe("23514");
  });

  it("las unidades tienen que ser mayores a cero", async () => {
    const { error } = await duenio.cliente
      .from("presentaciones_insumo")
      .insert({ insumo_id: insumoId, nombre: "Cero", unidades: 0 });
    expect(error?.code).toBe("23514");
  });

  it("ni el dueño puede borrar una presentación: se desactiva", async () => {
    const { error } = await duenio.cliente
      .from("presentaciones_insumo")
      .delete()
      .eq("id", presentacionId);
    expect(error).not.toBeNull();
  });
});
```

- [ ] **Step 2: Correrlo y verificar que falla**

Run: `npx vitest run src/modulos/presentaciones/rls.test.ts`
Expected: FAIL en `beforeAll` (la tabla `presentaciones_insumo` no existe → `presentacion` es `null` y `presentacion!.id` explota). Los tests "negativos" pueden pasar por casualidad hasta que exista la tabla; los que cuentan son los positivos.

- [ ] **Step 3: Escribir la migración**

Crear `supabase/migrations/20260929100000_presentaciones_insumo.sql`:

```sql
-- ============================================================================
-- Presentaciones de un insumo: "Unidad", "Docena", cada una con su precio.
-- ============================================================================
-- Un insumo se puede vender suelto si tiene alguna presentación activa. El
-- precio por docena es un precio por mayor, no 12 × la unidad, por eso vive
-- en la presentación y no en el insumo.
--
-- Sin `delete` para authenticated: una presentación con ventas encima no
-- se borra, se desactiva (mismo criterio que los formatos). El `check`
-- activa_con_precio es la regla "se carga inactiva hasta que Goro le pone
-- precio" dentro de la base: ninguna pantalla puede dejar algo a la venta a $0.
-- ============================================================================
create table public.presentaciones_insumo (
  id         integer generated always as identity primary key,
  insumo_id  integer not null references public.insumos (id),
  nombre     text not null,
  unidades   integer not null,
  precio     integer not null default 0,
  activo     boolean not null default false,
  creado_en  timestamptz not null default now(),
  constraint nombre_no_vacio check (length(trim(nombre)) > 0),
  constraint unidades_positivas check (unidades > 0),
  constraint precio_no_negativo check (precio >= 0),
  constraint activa_con_precio check (not activo or precio > 0)
);

-- "Solo puede haber una x12 por insumo": índice, no un select previo.
create unique index presentaciones_insumo_una_por_tamano
  on public.presentaciones_insumo (insumo_id, unidades);

alter table public.presentaciones_insumo enable row level security;
grant select, insert on public.presentaciones_insumo to authenticated;
grant update (nombre, unidades, precio, activo) on public.presentaciones_insumo to authenticated;
revoke all on public.presentaciones_insumo from anon;
revoke delete on public.presentaciones_insumo from authenticated;

create policy "presentaciones_insumo: cualquier sesion activa lee"
  on public.presentaciones_insumo for select to authenticated
  using (public.auth_rol() is not null);

create policy "presentaciones_insumo: solo el dueño da de alta"
  on public.presentaciones_insumo for insert to authenticated
  with check (public.es_duenio());

create policy "presentaciones_insumo: solo el dueño edita"
  on public.presentaciones_insumo for update to authenticated
  using (public.es_duenio())
  with check (public.es_duenio());
```

- [ ] **Step 4: Aplicar en PRUEBAS (lo hace Enzo)**

Pegar el contenido del archivo en el SQL Editor del proyecto de **pruebas** y ejecutar. Esperar confirmación de Enzo antes de seguir.

- [ ] **Step 5: Correr los tests y verificar que pasan**

Run: `npx vitest run src/modulos/presentaciones/rls.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 6: Commit**

```bash
git add src/modulos/presentaciones/rls.test.ts supabase/migrations/20260929100000_presentaciones_insumo.sql
git commit -m "Agregar presentaciones de insumo (x1, x12) con precio propio"
```

---

### Task 2: Qué consume cada formato (tabla + RLS)

**Files:**
- Modify: `src/modulos/presentaciones/rls.test.ts`
- Create: `supabase/migrations/20260929110000_formato_insumos.sql`

**Interfaces:**
- Consumes: `formatos`, `insumos` (existen); `presentaciones/rls.test.ts` y sus helpers `crearUsuarioDePrueba`, `codigoDePrueba` (Tarea 1).
- Produces: tabla `public.formato_insumos (formato_id, insumo_id, cantidad)` con PK `(formato_id, insumo_id)`; borrar un formato borra sus filas.

- [ ] **Step 1: Escribir el test que falla**

Agregar al final de `src/modulos/presentaciones/rls.test.ts`:

```ts
describe("RLS: qué consume cada formato", () => {
  let duenio: Awaited<ReturnType<typeof crearUsuarioDePrueba>>;
  let colaborador: Awaited<ReturnType<typeof crearUsuarioDePrueba>>;
  let anonimo: ReturnType<typeof createClient>;
  let insumoId: number;
  let formatoId: number;

  beforeAll(async () => {
    duenio = await crearUsuarioDePrueba("duenio");
    colaborador = await crearUsuarioDePrueba("colaborador");
    anonimo = createClient(url, clavePublica);

    const { data: insumo } = await servicio
      .from("insumos")
      .insert({
        nombre: `Cono de prueba ${Date.now()}`,
        codigo: codigoDePrueba(),
        unidad: "u",
        minimo: 0,
        costo: 0,
      })
      .select("id")
      .single();
    insumoId = insumo!.id;

    const { data: formato } = await servicio
      .from("formatos")
      .insert({ nombre: `Formato de prueba ${Date.now()}`, gramos: 130, cantidad_sabores: 2, precio: 0 })
      .select("id")
      .single();
    formatoId = formato!.id;
  });

  afterAll(async () => {
    await servicio.from("formatos").delete().eq("id", formatoId);
    await servicio.from("insumos").delete().eq("id", insumoId);
    await servicio.auth.admin.deleteUser(duenio.id);
    await servicio.auth.admin.deleteUser(colaborador.id);
  });

  it("sin sesión no se puede leer", async () => {
    const { data, error } = await anonimo.from("formato_insumos").select("formato_id");
    expect(data).toEqual([]);
    expect(error).toBeNull();
  });

  it("un colaborador no puede crear un consumo", async () => {
    const { error } = await colaborador.cliente
      .from("formato_insumos")
      .insert({ formato_id: formatoId, insumo_id: insumoId, cantidad: 1 });
    expect(error).not.toBeNull();
  });

  it("el dueño crea un consumo y un colaborador lo lee", async () => {
    const { error } = await duenio.cliente
      .from("formato_insumos")
      .insert({ formato_id: formatoId, insumo_id: insumoId, cantidad: 1 });
    expect(error).toBeNull();

    const { data } = await colaborador.cliente
      .from("formato_insumos")
      .select("cantidad")
      .eq("formato_id", formatoId);
    expect(data).toEqual([{ cantidad: 1 }]);
  });

  it("no se repite el mismo insumo en el mismo formato", async () => {
    const { error } = await duenio.cliente
      .from("formato_insumos")
      .insert({ formato_id: formatoId, insumo_id: insumoId, cantidad: 2 });
    expect(error?.code).toBe("23505");
  });

  it("la cantidad tiene que ser mayor a cero", async () => {
    const { error } = await servicio
      .from("formato_insumos")
      .update({ cantidad: 0 })
      .eq("formato_id", formatoId);
    expect(error?.code).toBe("23514");
  });

  it("un colaborador no puede quitar un consumo", async () => {
    await colaborador.cliente.from("formato_insumos").delete().eq("formato_id", formatoId);
    const { data } = await servicio.from("formato_insumos").select("cantidad").eq("formato_id", formatoId);
    expect(data).toHaveLength(1);
  });

  it("borrar el formato borra sus consumos", async () => {
    const { data: otro } = await servicio
      .from("formatos")
      .insert({ nombre: `Formato efímero ${Date.now()}`, gramos: 65, cantidad_sabores: 1, precio: 0 })
      .select("id")
      .single();
    await servicio
      .from("formato_insumos")
      .insert({ formato_id: otro!.id, insumo_id: insumoId, cantidad: 1 });

    await servicio.from("formatos").delete().eq("id", otro!.id);

    const { data } = await servicio.from("formato_insumos").select("cantidad").eq("formato_id", otro!.id);
    expect(data).toEqual([]);
  });
});
```

- [ ] **Step 2: Correrlo y verificar que falla**

Run: `npx vitest run src/modulos/presentaciones/rls.test.ts -t "qué consume"`
Expected: FAIL (`el dueño crea un consumo…` y `borrar el formato…`: la tabla no existe).

- [ ] **Step 3: Escribir la migración**

Crear `supabase/migrations/20260929110000_formato_insumos.sql`:

```sql
-- ============================================================================
-- Qué insumos consume un formato al venderse con helado.
-- ============================================================================
-- "Cucurucho doble" consume 1 "Cono doble". Un formato sin filas no consume
-- nada (el vasito simple). Se descuenta desde registrar_venta, no desde acá.
--
-- Diferencias con presentaciones_insumo, a propósito:
--  * formato_id lleva `on delete cascade`: esto es configuración, no
--    historial (lo vendido queda en movimientos_insumo). Sin el cascade, el
--    botón "Borrar formato" fallaría con un mensaje engañoso.
--  * el dueño puede borrar filas (quitar un consumo).
--  * el `update` cubre las tres columnas porque el upsert de PostgREST
--    reescribe todas las que envía; es solo del dueño, así que no abre nada.
-- ============================================================================
create table public.formato_insumos (
  formato_id  integer not null references public.formatos (id) on delete cascade,
  insumo_id   integer not null references public.insumos (id),
  cantidad    integer not null,
  primary key (formato_id, insumo_id),
  constraint cantidad_positiva check (cantidad > 0)
);

alter table public.formato_insumos enable row level security;
grant select, insert, delete on public.formato_insumos to authenticated;
grant update (formato_id, insumo_id, cantidad) on public.formato_insumos to authenticated;
revoke all on public.formato_insumos from anon;

create policy "formato_insumos: cualquier sesion activa lee"
  on public.formato_insumos for select to authenticated
  using (public.auth_rol() is not null);

create policy "formato_insumos: solo el dueño da de alta"
  on public.formato_insumos for insert to authenticated
  with check (public.es_duenio());

create policy "formato_insumos: solo el dueño edita"
  on public.formato_insumos for update to authenticated
  using (public.es_duenio())
  with check (public.es_duenio());

create policy "formato_insumos: solo el dueño borra"
  on public.formato_insumos for delete to authenticated
  using (public.es_duenio());
```

- [ ] **Step 4: Aplicar en PRUEBAS (lo hace Enzo)** y esperar confirmación.

- [ ] **Step 5: Correr los tests**

Run: `npx vitest run src/modulos/presentaciones/rls.test.ts`
Expected: PASS (9 + 7 tests).

- [ ] **Step 6: Commit**

```bash
git add src/modulos/presentaciones/rls.test.ts supabase/migrations/20260929110000_formato_insumos.sql
git commit -m "Agregar qué insumos consume cada formato"
```

---

### Task 3: Cobrar y anular productos y conos (SQL)

**Files:**
- Modify: `src/modulos/ventas/rls.test.ts`
- Create: `supabase/migrations/20260929120000_tipos_movimiento_venta.sql`
- Create: `supabase/migrations/20260929130000_venta_de_productos.sql`

**Interfaces:**
- Consumes: `presentaciones_insumo` (Tarea 1), `formato_insumos` (Tarea 2), `aplicar_movimiento_balde`, `registrar_venta`, `anular_venta` actuales.
- Produces:
  - `registrar_venta(p_items jsonb, p_medio_pago medio_pago) returns integer` — cada item es `{"formato_id": n, "sabor_ids": [..]}` **o** `{"presentacion_id": n}`; nunca los dos.
  - `venta_items.presentacion_id` (nullable, FK) y `movimientos_insumo.venta_item_id` (nullable, FK).
  - Funciones internas (sin grant): `aplicar_movimiento_insumo(p_insumo_id, p_tipo, p_cantidad, p_venta_item_id)`, `cobrar_item_formato(p_venta_id, p_item)`, `cobrar_item_presentacion(p_venta_id, p_item)`, ambas devuelven el precio cobrado (integer).

- [ ] **Step 1: Escribir los tests que fallan**

Agregar al final de `src/modulos/ventas/rls.test.ts` (después del `describe` existente):

```ts
/** Código GA + 7 dígitos al azar: los archivos de test corren en paralelo. */
function codigoDePrueba() {
  return `GA${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
}

async function stockDe(insumoId: number) {
  const { data } = await servicio.from("insumos").select("cantidad").eq("id", insumoId).single();
  return Number(data!.cantidad);
}

async function kgDe(baldeId: number) {
  const { data } = await servicio.from("baldes").select("kg_restante").eq("id", baldeId).single();
  return Number(data!.kg_restante);
}

/** Saca una venta de prueba con todo lo que la referencia, en el orden que piden las foreign keys. */
async function limpiarVenta(ventaId: number) {
  const { data: items } = await servicio.from("venta_items").select("id").eq("venta_id", ventaId);
  const ids = (items ?? []).map((item) => item.id);
  await servicio.from("movimientos_insumo").delete().in("venta_item_id", ids);
  await servicio.from("movimientos_balde").delete().in("venta_item_id", ids);
  await servicio.from("venta_items").delete().eq("venta_id", ventaId);
  await servicio.from("ventas").delete().eq("id", ventaId);
}

describe("Ventas: productos por unidad y conos", () => {
  let colaborador: Awaited<ReturnType<typeof crearUsuarioDePrueba>>;
  let saborId: number;
  let baldeId: number;
  let formatoId: number;
  let conoId: number;
  let bombonId: number;
  let docenaId: number;

  beforeAll(async () => {
    colaborador = await crearUsuarioDePrueba("colaborador");

    const { data: sabor } = await servicio
      .from("sabores")
      .insert({ nombre: `Sabor de producto ${Date.now()}` })
      .select("id")
      .single();
    saborId = sabor!.id;

    const { data: balde } = await servicio
      .from("baldes")
      .insert({
        codigo: `GB${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`,
        sabor_id: saborId,
        kg_inicial: 10,
        kg_restante: 10,
        estado: "abierto",
        costo: 1000,
        costo_envase: 500,
      })
      .select("id")
      .single();
    baldeId = balde!.id;

    const { data: cono } = await servicio
      .from("insumos")
      .insert({ nombre: `Cono ${Date.now()}`, codigo: codigoDePrueba(), unidad: "u", cantidad: 5, minimo: 0, costo: 0 })
      .select("id")
      .single();
    conoId = cono!.id;

    const { data: bombon } = await servicio
      .from("insumos")
      .insert({ nombre: `Bombón ${Date.now()}`, codigo: codigoDePrueba(), unidad: "u", cantidad: 20, minimo: 0, costo: 0 })
      .select("id")
      .single();
    bombonId = bombon!.id;

    const { data: docena } = await servicio
      .from("presentaciones_insumo")
      .insert({ insumo_id: bombonId, nombre: "Docena", unidades: 12, precio: 5000, activo: true })
      .select("id")
      .single();
    docenaId = docena!.id;

    const { data: formato } = await servicio
      .from("formatos")
      .insert({ nombre: `Formato con cono ${Date.now()}`, gramos: 130, cantidad_sabores: 1, precio: 3000 })
      .select("id")
      .single();
    formatoId = formato!.id;
    await servicio.from("formato_insumos").insert({ formato_id: formatoId, insumo_id: conoId, cantidad: 1 });
  });

  afterAll(async () => {
    await servicio.from("movimientos_insumo").delete().in("insumo_id", [conoId, bombonId]);
    await servicio.from("movimientos_balde").delete().eq("balde_id", baldeId);
    await servicio.from("presentaciones_insumo").delete().eq("insumo_id", bombonId);
    await servicio.from("formatos").delete().eq("id", formatoId);
    await servicio.from("insumos").delete().in("id", [conoId, bombonId]);
    await servicio.from("baldes").delete().eq("id", baldeId);
    await servicio.from("sabores").delete().eq("id", saborId);
    await servicio.auth.admin.deleteUser(colaborador.id);
  });

  it("vender un formato baja el helado y su cono; anular devuelve los dos, una sola vez", async () => {
    const { data: ventaId, error } = await colaborador.cliente.rpc("registrar_venta", {
      p_items: [{ formato_id: formatoId, sabor_ids: [saborId] }],
      p_medio_pago: "efectivo",
    });
    expect(error).toBeNull();
    expect(await stockDe(conoId)).toBe(4);
    expect(await kgDe(baldeId)).toBeCloseTo(9.87);

    await colaborador.cliente.rpc("anular_venta", { p_venta_id: ventaId });
    expect(await stockDe(conoId)).toBe(5);
    expect(await kgDe(baldeId)).toBeCloseTo(10);

    // Review Focus 2: anular otra vez da error y no devuelve nada de más.
    const { error: errorRepetido } = await colaborador.cliente.rpc("anular_venta", { p_venta_id: ventaId });
    expect(errorRepetido?.message).toMatch(/ya está anulada/);
    expect(await stockDe(conoId)).toBe(5);

    await limpiarVenta(ventaId as number);
  });

  it("vender una docena baja 12, congela el precio y anular devuelve las 12", async () => {
    const { data: ventaId, error } = await colaborador.cliente.rpc("registrar_venta", {
      p_items: [{ presentacion_id: docenaId }],
      p_medio_pago: "efectivo",
    });
    expect(error).toBeNull();
    expect(await stockDe(bombonId)).toBe(8);

    await servicio.from("presentaciones_insumo").update({ precio: 6000 }).eq("id", docenaId);
    const { data: item } = await servicio.from("venta_items").select("precio").eq("venta_id", ventaId).single();
    expect(item!.precio).toBe(5000);
    await servicio.from("presentaciones_insumo").update({ precio: 5000 }).eq("id", docenaId);

    await colaborador.cliente.rpc("anular_venta", { p_venta_id: ventaId });
    expect(await stockDe(bombonId)).toBe(20);
    await limpiarVenta(ventaId as number);
  });

  it("sin stock la venta pasa y el insumo queda negativo", async () => {
    const { data: ventaId, error } = await colaborador.cliente.rpc("registrar_venta", {
      p_items: [{ presentacion_id: docenaId }, { presentacion_id: docenaId }],
      p_medio_pago: "efectivo",
    });
    expect(error).toBeNull();
    expect(await stockDe(bombonId)).toBe(-4);

    await colaborador.cliente.rpc("anular_venta", { p_venta_id: ventaId });
    expect(await stockDe(bombonId)).toBe(20);
    await limpiarVenta(ventaId as number);
  });

  it("un item tiene que ser formato o producto, nunca los dos ni ninguno", async () => {
    for (const item of [
      { formato_id: formatoId, sabor_ids: [saborId], presentacion_id: docenaId },
      {},
    ]) {
      const { error } = await colaborador.cliente.rpc("registrar_venta", {
        p_items: [item],
        p_medio_pago: "efectivo",
      });
      expect(error?.message).toMatch(/formato o un producto/);
    }
  });

  it("una presentación inexistente da error y no deja ninguna venta a medias", async () => {
    const { count: antes } = await servicio.from("ventas").select("id", { count: "exact", head: true });
    const { error } = await colaborador.cliente.rpc("registrar_venta", {
      p_items: [{ presentacion_id: 999999999 }],
      p_medio_pago: "efectivo",
    });
    expect(error?.message).toMatch(/inválido o inactivo/);
    const { count: despues } = await servicio.from("ventas").select("id", { count: "exact", head: true });
    expect(despues).toBe(antes);
  });

  it("una presentación inactiva no se puede vender", async () => {
    await servicio.from("presentaciones_insumo").update({ activo: false }).eq("id", docenaId);
    const { error } = await colaborador.cliente.rpc("registrar_venta", {
      p_items: [{ presentacion_id: docenaId }],
      p_medio_pago: "efectivo",
    });
    expect(error?.message).toMatch(/inválido o inactivo/);
    await servicio.from("presentaciones_insumo").update({ activo: true }).eq("id", docenaId);
  });

  it("un cono desactivado no frena la venta del formato", async () => {
    await servicio.from("insumos").update({ activo: false }).eq("id", conoId);
    const { data: ventaId, error } = await colaborador.cliente.rpc("registrar_venta", {
      p_items: [{ formato_id: formatoId, sabor_ids: [saborId] }],
      p_medio_pago: "efectivo",
    });
    expect(error).toBeNull();
    expect(await stockDe(conoId)).toBe(4);

    await colaborador.cliente.rpc("anular_venta", { p_venta_id: ventaId });
    await servicio.from("insumos").update({ activo: true }).eq("id", conoId);
    await limpiarVenta(ventaId as number);
  });

  it("las funciones internas no se pueden llamar por RPC directo", async () => {
    const { error: errorMovimiento } = await colaborador.cliente.rpc("aplicar_movimiento_insumo", {
      p_insumo_id: bombonId,
      p_tipo: "ajuste",
      p_cantidad: 1,
      p_venta_item_id: null,
    });
    expect(errorMovimiento).not.toBeNull();

    const { error: errorCobro } = await colaborador.cliente.rpc("cobrar_item_presentacion", {
      p_venta_id: 1,
      p_item: { presentacion_id: docenaId },
    });
    expect(errorCobro).not.toBeNull();
  });

  it("la base rechaza un item con formato y presentación a la vez, o con ninguno", async () => {
    const { data: venta } = await servicio
      .from("ventas")
      .insert({ medio_pago: "efectivo", total: 0, creado_por: colaborador.id })
      .select("id")
      .single();

    const { error: ninguno } = await servicio.from("venta_items").insert({ venta_id: venta!.id, precio: 0 });
    expect(ninguno?.code).toBe("23514");

    const { error: ambos } = await servicio
      .from("venta_items")
      .insert({ venta_id: venta!.id, formato_id: formatoId, presentacion_id: docenaId, precio: 0 });
    expect(ambos?.code).toBe("23514");

    await servicio.from("ventas").delete().eq("id", venta!.id);
  });
});
```

Ojo con el tope de 400 líneas de código por archivo de test: con esto `ventas/rls.test.ts` queda cerca. Si el lint lo marca, mover el `describe` nuevo (y sus helpers) a `src/modulos/ventas/productos/rls.test.ts`, que también queda excluido de `test:unit` por el glob.

- [ ] **Step 2: Correrlos y verificar que fallan**

Run: `npx vitest run src/modulos/ventas/rls.test.ts -t "productos por unidad"`
Expected: FAIL (columnas y funciones que todavía no existen).

- [ ] **Step 3: Migración del enum, sola**

Crear `supabase/migrations/20260929120000_tipos_movimiento_venta.sql`:

```sql
-- ============================================================================
-- Dos valores nuevos para los movimientos de insumo: venta y anulación.
-- ============================================================================
-- Van solos en su propia migración: Postgres no deja usar un valor de enum
-- recién agregado dentro de la misma transacción que lo agrega, y la
-- migración siguiente los usa. Espejan a tipo_movimiento_balde. (La
-- migración de inventario anticipaba 'consumo'; se prefiere venta/anulacion
-- para que el ledger de insumos y el de baldes se lean igual.)
-- ============================================================================
alter type public.tipo_movimiento_insumo add value if not exists 'venta';
alter type public.tipo_movimiento_insumo add value if not exists 'anulacion';
```

- [ ] **Step 4: Migración de venta de productos**

Crear `supabase/migrations/20260929130000_venta_de_productos.sql`:

```sql
-- ============================================================================
-- Vender productos por unidad y descontar el cono de cada formato.
-- ============================================================================
-- registrar_venta se parte en dos funciones internas (cobrar_item_formato y
-- cobrar_item_presentacion) para no crecer más allá de lo legible. Todo sigue
-- dentro de UNA transacción: si cualquier ítem falla, no queda ninguna venta.
--
-- El stock de un insumo puede quedar negativo a propósito (decisión de
-- Goro): con el cliente esperando, lo que está mal es el conteo, no la venta.
-- ============================================================================

alter table public.movimientos_insumo
  add column venta_item_id integer references public.venta_items (id);

alter table public.venta_items
  alter column formato_id drop not null,
  add column presentacion_id integer references public.presentaciones_insumo (id),
  add constraint item_es_formato_o_presentacion
    check ((formato_id is null) <> (presentacion_id is null));

-- La única función que escribe movimientos de insumo ligados a una venta.
-- Sin grant: solo la llaman las funciones de abajo.
create function public.aplicar_movimiento_insumo(
  p_insumo_id integer,
  p_tipo public.tipo_movimiento_insumo,
  p_cantidad numeric,
  p_venta_item_id integer
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.movimientos_insumo (insumo_id, venta_item_id, tipo, cantidad, creado_por)
  values (p_insumo_id, p_venta_item_id, p_tipo, p_cantidad, auth.uid());

  update public.insumos set cantidad = cantidad + p_cantidad where id = p_insumo_id;
end;
$$;

revoke execute on function public.aplicar_movimiento_insumo(integer, public.tipo_movimiento_insumo, numeric, integer)
  from public, anon, authenticated;

-- Un item de tipo formato: helado de los baldes abiertos + los insumos que
-- consume el formato (su cono). Devuelve el precio cobrado.
create function public.cobrar_item_formato(p_venta_id integer, p_item jsonb)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_formato public.formatos%rowtype;
  v_sabor_nombre text;
  v_sabor_ids integer[];
  v_cantidad_sabores integer;
  v_kg numeric;
  v_sabor_id integer;
  v_balde_id integer;
  v_item_id integer;
  v_consumo record;
begin
  select * into v_formato from public.formatos
    where id = (p_item->>'formato_id')::integer and activo
    for update;
  if not found then
    raise exception 'Formato inválido o inactivo.';
  end if;

  select array_agg(distinct value::integer) into v_sabor_ids
    from jsonb_array_elements_text(p_item->'sabor_ids');
  v_cantidad_sabores := coalesce(array_length(v_sabor_ids, 1), 0);

  if v_cantidad_sabores < 1 or v_cantidad_sabores > v_formato.cantidad_sabores then
    raise exception 'Elegí entre 1 y % sabores para %.', v_formato.cantidad_sabores, v_formato.nombre;
  end if;

  insert into public.venta_items (venta_id, formato_id, precio)
  values (p_venta_id, v_formato.id, v_formato.precio)
  returning id into v_item_id;

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

  -- No se mira si el insumo está activo ni si alcanza el stock: no se frena
  -- una venta por un conteo.
  for v_consumo in
    select insumo_id, cantidad from public.formato_insumos where formato_id = v_formato.id
  loop
    perform public.aplicar_movimiento_insumo(v_consumo.insumo_id, 'venta', -v_consumo.cantidad, v_item_id);
  end loop;

  return v_formato.precio;
end;
$$;

revoke execute on function public.cobrar_item_formato(integer, jsonb)
  from public, anon, authenticated;

-- Un item de tipo producto: una presentación (unidad, docena) de un insumo.
create function public.cobrar_item_presentacion(p_venta_id integer, p_item jsonb)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_presentacion public.presentaciones_insumo%rowtype;
  v_item_id integer;
begin
  select * into v_presentacion from public.presentaciones_insumo
    where id = (p_item->>'presentacion_id')::integer and activo
    for update;
  if not found then
    raise exception 'Producto inválido o inactivo.';
  end if;

  perform 1 from public.insumos where id = v_presentacion.insumo_id and activo;
  if not found then
    raise exception 'Producto inválido o inactivo.';
  end if;

  insert into public.venta_items (venta_id, presentacion_id, precio)
  values (p_venta_id, v_presentacion.id, v_presentacion.precio)
  returning id into v_item_id;

  perform public.aplicar_movimiento_insumo(v_presentacion.insumo_id, 'venta', -v_presentacion.unidades, v_item_id);

  return v_presentacion.precio;
end;
$$;

revoke execute on function public.cobrar_item_presentacion(integer, jsonb)
  from public, anon, authenticated;

-- Arma el ticket: cada item es un formato (con sabores) o un producto.
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
  v_venta_id integer;
  v_total integer := 0;
  v_item jsonb;
  v_es_formato boolean;
  v_es_producto boolean;
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

  return v_venta_id;
end;
$$;

-- Anula una venta cobrada: revierte el neto de cada balde y de cada insumo.
create or replace function public.anular_venta(p_venta_id integer)
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
```

- [ ] **Step 5: Aplicar en PRUEBAS, en orden y de a una (lo hace Enzo)**

Primero `20260929120000_tipos_movimiento_venta.sql`, ejecutar y confirmar; **después** `20260929130000_venta_de_productos.sql`. Esperar confirmación de Enzo.

- [ ] **Step 6: Correr los tests de ventas completos**

Run: `npx vitest run src/modulos/ventas/rls.test.ts`
Expected: PASS: los 4 tests viejos (no se rompió nada de lo que ya funcionaba) y los 9 nuevos. Si un test viejo falla, **parar**: la migración es aditiva y no debería romper `registrar_venta` con `formato_id`.

- [ ] **Step 7: Commit**

```bash
git add src/modulos/ventas/rls.test.ts supabase/migrations/20260929120000_tipos_movimiento_venta.sql supabase/migrations/20260929130000_venta_de_productos.sql
git commit -m "Vender productos por unidad y descontar el cono de cada formato"
```

---

### Task 4: Lógica pura del ticket con productos

**Files:**
- Create: `src/modulos/ventas/ticket.ts`
- Create: `src/modulos/ventas/ticket.test.ts`
- Create: `src/modulos/ventas/nombreItem.ts`
- Create: `src/modulos/ventas/nombreItem.test.ts`
- Modify: `src/modulos/ventas/tipos.ts`

**Interfaces:**
- Consumes: nada de otras tareas (es lógica pura).
- Produces:
  - `ItemDeTicket = { tipo: "formato"; formatoId: number; saborIds: number[] } | { tipo: "producto"; presentacionId: number }`
  - `ItemEnCarrito = ItemDeTicket & { nombre: string; precio: number; saboresNombres: string[] }`
  - `itemsParaServidor(items: ItemDeTicket[]): ItemParaServidor[]`, `saborIdsDe(item: ItemDeTicket): number[]`, `totalDelCarrito(items: { precio: number }[]): number`
  - `nombreDeItem(fila: FilaNombreItem): string`
  - Los tipos `ItemEnCarrito`, `ItemVentaReciente` y `ItemParaDetalle` renombran `formatoNombre` → `nombre` (**esa migración de nombre se termina en la Tarea 5**; hasta entonces `npm run typecheck` va a fallar y es esperado).

- [ ] **Step 1: Escribir los tests que fallan**

Crear `src/modulos/ventas/ticket.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { itemsParaServidor, saborIdsDe, totalDelCarrito } from "./ticket";
import type { ItemEnCarrito } from "./tipos";

const cucurucho: ItemEnCarrito = {
  tipo: "formato",
  formatoId: 3,
  saborIds: [1, 2],
  nombre: "Cucurucho doble",
  precio: 3000,
  saboresNombres: ["Frutilla", "Limón"],
};

const docena: ItemEnCarrito = {
  tipo: "producto",
  presentacionId: 7,
  nombre: "Bombón · Docena",
  precio: 5000,
  saboresNombres: [],
};

describe("itemsParaServidor", () => {
  it("un formato viaja con sus sabores y sin presentación", () => {
    expect(itemsParaServidor([cucurucho])).toEqual([{ formato_id: 3, sabor_ids: [1, 2] }]);
  });

  it("un producto viaja solo con su presentación", () => {
    expect(itemsParaServidor([docena])).toEqual([{ presentacion_id: 7 }]);
  });

  it("un ticket mezclado conserva el orden y la forma de cada item", () => {
    expect(itemsParaServidor([cucurucho, docena])).toEqual([
      { formato_id: 3, sabor_ids: [1, 2] },
      { presentacion_id: 7 },
    ]);
  });
});

describe("saborIdsDe", () => {
  it("devuelve los sabores de un formato y ninguno de un producto", () => {
    expect(saborIdsDe(cucurucho)).toEqual([1, 2]);
    expect(saborIdsDe(docena)).toEqual([]);
  });
});

describe("totalDelCarrito", () => {
  it("suma formatos y productos juntos", () => {
    expect(totalDelCarrito([cucurucho, docena, docena])).toBe(13000);
  });

  it("un carrito vacío vale cero", () => {
    expect(totalDelCarrito([])).toBe(0);
  });
});
```

Crear `src/modulos/ventas/nombreItem.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { nombreDeItem } from "./nombreItem";

describe("nombreDeItem", () => {
  it("usa el nombre del formato cuando el item es un formato", () => {
    expect(
      nombreDeItem({ formatos: { nombre: "Cucurucho doble" }, presentaciones_insumo: null }),
    ).toBe("Cucurucho doble");
  });

  it("junta insumo y presentación cuando el item es un producto", () => {
    expect(
      nombreDeItem({
        formatos: null,
        presentaciones_insumo: { nombre: "Docena", insumos: { nombre: "Bombón" } },
      }),
    ).toBe("Bombón · Docena");
  });

  it("no explota si falta el insumo o no hay nada", () => {
    expect(
      nombreDeItem({ formatos: null, presentaciones_insumo: { nombre: "Docena", insumos: null } }),
    ).toBe("Docena");
    expect(nombreDeItem({ formatos: null, presentaciones_insumo: null })).toBe("");
  });
});
```

- [ ] **Step 2: Verificar que fallan**

Run: `npx vitest run src/modulos/ventas/ticket.test.ts src/modulos/ventas/nombreItem.test.ts`
Expected: FAIL (`Failed to resolve import "./ticket"` y `"./nombreItem"`).

- [ ] **Step 3: Implementar**

Crear `src/modulos/ventas/ticket.ts`:

```ts
import type { ItemDeTicket } from "./tipos";

/**
 * Lo que espera registrar_venta: cada item es un formato (con sus sabores) o
 * una presentación de producto, nunca las dos. La base lo vuelve a exigir.
 */
export type ItemParaServidor =
  | { formato_id: number; sabor_ids: number[] }
  | { presentacion_id: number };

export function itemsParaServidor(items: ItemDeTicket[]): ItemParaServidor[] {
  return items.map((item) =>
    item.tipo === "producto"
      ? { presentacion_id: item.presentacionId }
      : { formato_id: item.formatoId, sabor_ids: item.saborIds },
  );
}

/** Un producto no lleva sabores: las pantallas que dibujan puntos de color lo tratan como lista vacía. */
export function saborIdsDe(item: ItemDeTicket): number[] {
  return item.tipo === "formato" ? item.saborIds : [];
}

export function totalDelCarrito(items: { precio: number }[]): number {
  return items.reduce((suma, item) => suma + item.precio, 0);
}
```

Crear `src/modulos/ventas/nombreItem.ts`:

```ts
export type FilaNombreItem = {
  formatos: { nombre: string } | null;
  presentaciones_insumo: { nombre: string; insumos: { nombre: string } | null } | null;
};

/** "Cucurucho doble" para un formato, "Bombón · Docena" para un producto: mismo nombre que ve el cajero en el carrito. */
export function nombreDeItem(fila: FilaNombreItem): string {
  if (fila.formatos) return fila.formatos.nombre;

  const presentacion = fila.presentaciones_insumo;
  if (!presentacion) return "";
  return presentacion.insumos
    ? `${presentacion.insumos.nombre} · ${presentacion.nombre}`
    : presentacion.nombre;
}
```

Modificar `src/modulos/ventas/tipos.ts`: reemplazar los tipos `ItemDeTicket`, `ItemEnCarrito` e `ItemVentaReciente`:

```ts
/** Lo mínimo que necesita el servidor para registrar un item. */
export type ItemDeTicket =
  | { tipo: "formato"; formatoId: number; saborIds: number[] }
  | { tipo: "producto"; presentacionId: number };

/** Lo que necesita la pantalla para mostrar el ticket en construcción. */
export type ItemEnCarrito = ItemDeTicket & {
  nombre: string;
  precio: number;
  saboresNombres: string[];
};
```

y en `ItemVentaReciente` cambiar `formatoNombre: string;` por `nombre: string;`.

- [ ] **Step 4: Verificar que pasan**

Run: `npx vitest run src/modulos/ventas/ticket.test.ts src/modulos/ventas/nombreItem.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add src/modulos/ventas/ticket.ts src/modulos/ventas/ticket.test.ts src/modulos/ventas/nombreItem.ts src/modulos/ventas/nombreItem.test.ts src/modulos/ventas/tipos.ts
git commit -m "Agregar la lógica pura del ticket con productos"
```

---

### Task 5: Productos en el mostrador

**Files:**
- Create: `src/lib/presentaciones.ts`
- Create: `src/modulos/ventas/componentes/SelectorDeProductos.tsx`
- Modify: `src/app/(app)/ventas/page.tsx`
- Modify: `src/modulos/ventas/componentes/FormularioTicket.tsx`
- Modify: `src/modulos/ventas/componentes/SelectorFormatoYSabores.tsx`
- Modify: `src/modulos/ventas/componentes/CarritoTicket.tsx`
- Modify: `src/modulos/ventas/componentes/LineasDeCarrito.tsx`
- Modify: `src/modulos/ventas/componentes/TicketConfirmado.tsx`
- Modify: `src/modulos/ventas/componentes/DetalleTicket.tsx`
- Modify: `src/modulos/ventas/componentes/FilaVentaReciente.tsx`
- Modify: `src/modulos/ventas/consultas/acciones.ts`
- Modify: `src/modulos/ventas/consultas/ventas.ts`

**Interfaces:**
- Consumes: `itemsParaServidor`, `saborIdsDe`, `totalDelCarrito`, `nombreDeItem`, tipos de la Tarea 4.
- Produces: `Presentacion = { id; insumoId; insumoNombre; insumoActivo; nombre; unidades; precio; activo }` y `listarPresentaciones(): Promise<Presentacion[]>` en `@/lib/presentaciones`.

- [ ] **Step 1: El listado compartido**

Crear `src/lib/presentaciones.ts` (mismo patrón que `src/lib/formatos.ts`):

```ts
import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";

export type Presentacion = {
  id: number;
  insumoId: number;
  insumoNombre: string;
  insumoActivo: boolean;
  nombre: string;
  unidades: number;
  precio: number;
  activo: boolean;
};

type FilaPresentacion = {
  id: number;
  insumo_id: number;
  nombre: string;
  unidades: number;
  precio: number;
  activo: boolean;
  insumos: { nombre: string; activo: boolean } | null;
};

function mapearPresentacion(fila: FilaPresentacion): Presentacion {
  return {
    id: fila.id,
    insumoId: fila.insumo_id,
    insumoNombre: fila.insumos?.nombre ?? "",
    insumoActivo: fila.insumos?.activo ?? false,
    nombre: fila.nombre,
    unidades: fila.unidades,
    precio: fila.precio,
    activo: fila.activo,
  };
}

/** Todas las presentaciones, por insumo y de menor a mayor. RLS ya limita esto a una sesión activa. */
export async function listarPresentaciones(): Promise<Presentacion[]> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("presentaciones_insumo")
    .select("id, insumo_id, nombre, unidades, precio, activo, insumos ( nombre, activo )")
    .order("insumo_id")
    .order("unidades");

  return ((data as unknown as FilaPresentacion[] | null) ?? []).map(mapearPresentacion);
}
```

- [ ] **Step 2: Los botones de productos**

Crear `src/modulos/ventas/componentes/SelectorDeProductos.tsx`:

```tsx
"use client";

import type { Presentacion } from "@/lib/presentaciones";
import type { ItemEnCarrito } from "../tipos";

export function SelectorDeProductos({
  presentaciones,
  onAgregar,
}: {
  presentaciones: Presentacion[];
  onAgregar: (item: ItemEnCarrito) => void;
}) {
  if (presentaciones.length === 0) return null;

  return (
    <div>
      <p className="mb-2 font-mono text-xs tracking-wide text-texto-suave uppercase">Productos</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {presentaciones.map((presentacion) => (
          <button
            key={presentacion.id}
            type="button"
            onClick={() =>
              onAgregar({
                tipo: "producto",
                presentacionId: presentacion.id,
                nombre: `${presentacion.insumoNombre} · ${presentacion.nombre}`,
                precio: presentacion.precio,
                saboresNombres: [],
              })
            }
            className="flex flex-col items-center gap-1 rounded-(--radius-arco) border border-linea bg-superficie p-3 text-center transition hover:bg-superficie-honda"
          >
            <span className="font-display font-semibold">{presentacion.insumoNombre}</span>
            <span className="font-mono text-xs opacity-70">{presentacion.nombre}</span>
            <span className="numero">${presentacion.precio}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Cablear la página y el formulario**

En `src/app/(app)/ventas/page.tsx`: importar `listarPresentaciones` de `@/lib/presentaciones`, agregarlo al `Promise.all` (`[formatos, sabores, baldes, presentaciones]`) y pasar `presentaciones={presentaciones}` a `<FormularioTicket>`.

En `src/modulos/ventas/componentes/FormularioTicket.tsx`:
1. Importar `type Presentacion` de `@/lib/presentaciones`, `SelectorDeProductos` de `./SelectorDeProductos` y `totalDelCarrito` de `../ticket`.
2. Agregar la prop `presentaciones: Presentacion[]` (tipo y desestructuración).
3. Reemplazar `const total = carrito.reduce((suma, item) => suma + item.precio, 0);` por `const total = totalDelCarrito(carrito);`.
4. Reemplazar el bloque `<SelectorFormatoYSabores ... />` por:

```tsx
      <div className="flex flex-col gap-4">
        <SelectorFormatoYSabores
          formatos={formatos.filter((formato) => formato.activo)}
          sabores={sabores}
          baldes={baldes}
          onAgregar={(item) => setCarrito((actuales) => [...actuales, item])}
        />
        <SelectorDeProductos
          presentaciones={presentaciones.filter(
            (presentacion) => presentacion.activo && presentacion.insumoActivo,
          )}
          onAgregar={(item) => setCarrito((actuales) => [...actuales, item])}
        />
      </div>
```

- [ ] **Step 4: Migrar `formatoNombre` → `nombre` y el tipo de ítem**

- `SelectorFormatoYSabores.tsx`, en `completar`: el objeto de `onAgregar` pasa a
  `{ tipo: "formato", formatoId: formato.id, saborIds: idsFinal, nombre: formato.nombre, precio: formato.precio, saboresNombres }`.
- `LineasDeCarrito.tsx`: importar `saborIdsDe` de `../ticket`; cambiar `item.formatoNombre` por `item.nombre` (2 lugares: el texto y el `aria-label`) y `item.saborIds.map(` por `saborIdsDe(item).map(`.
- `TicketConfirmado.tsx`: importar `saborIdsDe` de `../ticket`; `formatoNombre: item.formatoNombre` → `nombre: item.nombre`; `item.saborIds.map(` → `saborIdsDe(item).map(`.
- `DetalleTicket.tsx`: en `ItemParaDetalle` y en el `<span>` de la lista, `formatoNombre` → `nombre`.
- `FilaVentaReciente.tsx`: `formatoNombre: item.formatoNombre` → `nombre: item.nombre`.
- `CarritoTicket.tsx`: importar `itemsParaServidor` y `totalDelCarrito` de `../ticket`; quitar `ItemDeTicket` del import de tipos si queda sin uso; reemplazar el `reduce` por `totalDelCarrito(carrito)`; reemplazar el bloque `itemsParaEnviar` por `const itemsParaEnviar = carrito;` y en el `<input type="hidden" name="items" ...>` dejar `value={JSON.stringify(carrito)}`; cambiar el texto vacío a `Elegí un formato (y sus sabores) o un producto.`
  (El servidor traduce con `itemsParaServidor`; el cliente manda el ítem tal cual, con su `tipo`.)
- `acciones.ts`: importar `itemsParaServidor` de `../ticket` y reemplazar
  `p_items: items.map((item) => ({ formato_id: item.formatoId, sabor_ids: item.saborIds })),`
  por `p_items: itemsParaServidor(items),`.

- [ ] **Step 5: El historial reconoce los productos**

En `src/modulos/ventas/consultas/ventas.ts`:
1. Importar `nombreDeItem` de `../nombreItem`.
2. En `FilaItem`, agregar `presentaciones_insumo: { nombre: string; insumos: { nombre: string } | null } | null;`.
3. En `mapearItem`, reemplazar `formatoNombre: fila.formatos?.nombre ?? "",` por `nombre: nombreDeItem(fila),`.
4. En el `select` de `listarVentasRecientes`, después de `formatos ( nombre ),` agregar `presentaciones_insumo ( nombre, insumos ( nombre ) ),`.

- [ ] **Step 6: Verificar que no queda nada del nombre viejo**

Run: `git grep -n "formatoNombre" -- src`
Expected: sin resultados.

- [ ] **Step 7: `npm run verificar`**

Run: `npm run formato:arreglar && npm run verificar`
Expected: PASS (formato, lint, typecheck y tests unitarios). Si el lint marca un archivo por largo, partir el componente, no subir el límite.

- [ ] **Step 8: Probar a mano contra PRUEBAS**

Con `npm run dev` y datos de la Tarea 1-3 cargados en pruebas (un insumo con una presentación activa a precio > 0): en `/ventas`, agregar la presentación y un formato al mismo ticket, cobrar, expandir la venta en "Últimas ventas" y ver el nombre "Insumo · Presentación"; anular y ver que el stock del insumo vuelve.

- [ ] **Step 9: Commit**

```bash
git add src/lib/presentaciones.ts "src/app/(app)/ventas/page.tsx" src/modulos/ventas
git commit -m "Vender productos por unidad desde el mostrador"
```

---

### Task 6: Presentaciones por insumo en Stock

**Files:**
- Create: `src/modulos/presentaciones/validacion.ts`
- Create: `src/modulos/presentaciones/validacion.test.ts`
- Create: `src/modulos/presentaciones/consultas/acciones.ts`
- Create: `src/modulos/presentaciones/componentes/FilaPresentacion.tsx`
- Create: `src/modulos/presentaciones/componentes/FormularioPresentacion.tsx`
- Create: `src/modulos/presentaciones/componentes/PresentacionesInsumo.tsx`
- Modify: `src/modulos/inventario/alerta.ts`, `src/modulos/inventario/alerta.test.ts`
- Modify: `src/modulos/inventario/componentes/FilaInsumoExpandible.tsx`, `TablaInsumos.tsx`, `PanelStock.tsx`, `SeccionVerInventario.tsx`

**Interfaces:**
- Consumes: `Presentacion`, `listarPresentaciones` (Tarea 5); `Campo`, `Boton`, `useAccionConReset` (ya existen).
- Produces: `validarPresentacion(datos: DatosPresentacion): string | null`; acciones `crearPresentacion(_previo, datos)` y `editarPresentacion(_previo, datos)`; `estadoDeInsumo(cantidad, minimo): "negativo" | "bajo" | "ok"`.

- [ ] **Step 1: Tests que fallan**

Crear `src/modulos/presentaciones/validacion.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { validarPresentacion } from "./validacion";

const valida = { nombre: "Docena", unidades: 12, precio: 5000, activo: true };

describe("validarPresentacion", () => {
  it("acepta una presentación completa", () => {
    expect(validarPresentacion(valida)).toBeNull();
  });

  it("acepta una presentación inactiva sin precio: así se carga hasta que Goro lo complete", () => {
    expect(validarPresentacion({ ...valida, precio: 0, activo: false })).toBeNull();
  });

  it("rechaza un nombre vacío", () => {
    expect(validarPresentacion({ ...valida, nombre: "" })).toMatch(/nombre/);
  });

  it("rechaza unidades que no son enteros mayores a cero (12,5 · abc · 0 · negativo)", () => {
    for (const unidades of [12.5, Number("abc"), 0, -3]) {
      expect(validarPresentacion({ ...valida, unidades })).toMatch(/unidades/);
    }
  });

  it("rechaza un precio decimal, no numérico o negativo", () => {
    for (const precio of [99.5, Number("abc"), -1]) {
      expect(validarPresentacion({ ...valida, precio })).toMatch(/precio/);
    }
  });

  it("no deja activar una presentación a $0", () => {
    expect(validarPresentacion({ ...valida, precio: 0 })).toMatch(/activarla/);
  });
});
```

Agregar a `src/modulos/inventario/alerta.test.ts` (import `estadoDeInsumo` junto a `saborEnAlerta`):

```ts
describe("estadoDeInsumo", () => {
  it("un stock negativo se distingue de uno bajo: el conteo no cierra", () => {
    expect(estadoDeInsumo(-4, 0)).toBe("negativo");
  });

  it("bajo el mínimo, o justo en el mínimo, pide reponer", () => {
    expect(estadoDeInsumo(3, 5)).toBe("bajo");
    expect(estadoDeInsumo(5, 5)).toBe("bajo");
  });

  it("por encima del mínimo está bien", () => {
    expect(estadoDeInsumo(6, 5)).toBe("ok");
  });

  it("cero con mínimo cero pide reponer pero no es negativo", () => {
    expect(estadoDeInsumo(0, 0)).toBe("bajo");
  });
});
```

- [ ] **Step 2: Verificar que fallan**

Run: `npx vitest run src/modulos/presentaciones/validacion.test.ts src/modulos/inventario/alerta.test.ts`
Expected: FAIL (`validarPresentacion` y `estadoDeInsumo` no existen).

- [ ] **Step 3: Implementar la lógica pura**

Crear `src/modulos/presentaciones/validacion.ts`:

```ts
export type DatosPresentacion = {
  nombre: string;
  unidades: number;
  precio: number;
  activo: boolean;
};

/** La misma regla que los checks de la columna; acá solo para dar un mensaje legible antes de ir a la base. */
export function validarPresentacion(datos: DatosPresentacion): string | null {
  if (!datos.nombre) return "Escribí un nombre (por ejemplo, Docena).";
  if (!Number.isInteger(datos.unidades) || datos.unidades <= 0) {
    return "Las unidades tienen que ser un número entero mayor a cero.";
  }
  if (!Number.isInteger(datos.precio) || datos.precio < 0) {
    return "El precio tiene que ser un número entero, sin negativos.";
  }
  if (datos.activo && datos.precio === 0) return "Para activarla hace falta un precio mayor a cero.";
  return null;
}
```

Agregar al final de `src/modulos/inventario/alerta.ts`:

```ts
export type EstadoInsumo = "negativo" | "bajo" | "ok";

/**
 * Negativo no bloquea ninguna venta (decisión de negocio): solo avisa que el
 * conteo dejó de cerrar y hay que recontar.
 */
export function estadoDeInsumo(cantidad: number, minimo: number): EstadoInsumo {
  if (cantidad < 0) return "negativo";
  return cantidad <= minimo ? "bajo" : "ok";
}
```

- [ ] **Step 4: Verificar que pasan**

Run: `npx vitest run src/modulos/presentaciones/validacion.test.ts src/modulos/inventario/alerta.test.ts`
Expected: PASS.

- [ ] **Step 5: Acciones de servidor**

Crear `src/modulos/presentaciones/consultas/acciones.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { clienteServidor } from "@/lib/supabase/servidor";
import { validarPresentacion, type DatosPresentacion } from "../validacion";

export type EstadoFormulario = { error: string | null };

const SIN_ERROR: EstadoFormulario = { error: null };

function leerDatos(datos: FormData): DatosPresentacion {
  return {
    nombre: String(datos.get("nombre") ?? "").trim(),
    unidades: Number(datos.get("unidades")),
    precio: Number(datos.get("precio")),
    activo: datos.get("activo") === "on",
  };
}

/** 23505 = ya existe una presentación de ese tamaño para el insumo (índice único). */
function mensajeDeError(codigo: string | undefined, porDefecto: string): string {
  return codigo === "23505" ? "Ya existe una presentación con esa cantidad de unidades." : porDefecto;
}

export async function crearPresentacion(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const insumoId = Number(datos.get("insumoId"));
  const presentacion = { ...leerDatos(datos), activo: false };

  if (!Number.isInteger(insumoId) || insumoId <= 0) return { error: "Insumo inválido." };
  const errorValidacion = validarPresentacion(presentacion);
  if (errorValidacion) return { error: errorValidacion };

  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("presentaciones_insumo")
    .insert({ insumo_id: insumoId, ...presentacion });

  if (error) return { error: mensajeDeError(error.code, "No se pudo crear la presentación.") };

  revalidatePath("/inventario");
  return SIN_ERROR;
}

export async function editarPresentacion(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const presentacionId = Number(datos.get("presentacionId"));
  const presentacion = leerDatos(datos);

  if (!Number.isInteger(presentacionId) || presentacionId <= 0) {
    return { error: "Presentación inválida." };
  }
  const errorValidacion = validarPresentacion(presentacion);
  if (errorValidacion) return { error: errorValidacion };

  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("presentaciones_insumo")
    .update(presentacion)
    .eq("id", presentacionId);

  if (error) return { error: mensajeDeError(error.code, "No se pudo guardar la presentación.") };

  revalidatePath("/inventario");
  return SIN_ERROR;
}
```

- [ ] **Step 6: Componentes**

Crear `src/modulos/presentaciones/componentes/FilaPresentacion.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import type { Presentacion } from "@/lib/presentaciones";
import { editarPresentacion } from "../consultas/acciones";

const INICIAL = { error: null };

export function FilaPresentacion({ presentacion }: { presentacion: Presentacion }) {
  const [estado, accion, guardando] = useActionState(editarPresentacion, INICIAL);

  return (
    <form action={accion} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="presentacionId" value={presentacion.id} />
      <input
        type="text"
        name="nombre"
        defaultValue={presentacion.nombre}
        aria-label="Nombre de la presentación"
        disabled={guardando}
        className="w-28 rounded-(--r) border border-linea bg-superficie px-2 py-1 text-sm"
      />
      <input
        type="number"
        name="unidades"
        min="1"
        defaultValue={presentacion.unidades}
        aria-label="Unidades que descuenta"
        disabled={guardando}
        className="numero w-16 rounded-(--r) border border-linea bg-superficie px-2 py-1 text-sm"
      />
      <input
        type="number"
        name="precio"
        min="0"
        defaultValue={presentacion.precio}
        aria-label="Precio"
        disabled={guardando}
        className="numero w-24 rounded-(--r) border border-linea bg-superficie px-2 py-1 text-sm"
      />
      <label className="flex items-center gap-1 text-xs">
        <input type="checkbox" name="activo" defaultChecked={presentacion.activo} disabled={guardando} />
        A la venta
      </label>
      <button type="submit" disabled={guardando} className="text-xs underline opacity-70">
        {guardando ? "Guardando…" : "Guardar"}
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

Crear `src/modulos/presentaciones/componentes/FormularioPresentacion.tsx`:

```tsx
"use client";

import { Boton } from "@/componentes/Boton";
import { Campo } from "@/componentes/Campo";
import { useAccionConReset } from "@/lib/useAccionConReset";
import { crearPresentacion } from "../consultas/acciones";

const INICIAL = { error: null };

export function FormularioPresentacion({ insumoId }: { insumoId: number }) {
  const { estado, accion, enviando, formRef } = useAccionConReset(crearPresentacion, INICIAL);

  return (
    <form ref={formRef} action={accion} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="insumoId" value={insumoId} />
      <Campo id={`nombre-presentacion-${insumoId}`} name="nombre" etiqueta="Presentación" required />
      <Campo
        id={`unidades-presentacion-${insumoId}`}
        name="unidades"
        etiqueta="Unidades"
        type="number"
        min="1"
        required
      />
      <Campo
        id={`precio-presentacion-${insumoId}`}
        name="precio"
        etiqueta="Precio"
        type="number"
        min="0"
      />
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

Crear `src/modulos/presentaciones/componentes/PresentacionesInsumo.tsx`:

```tsx
import type { Presentacion } from "@/lib/presentaciones";
import { FilaPresentacion } from "./FilaPresentacion";
import { FormularioPresentacion } from "./FormularioPresentacion";

/**
 * Una presentación nueva nace inactiva y sin precio; recién sale a la venta
 * cuando se le pone un precio y se tilda "A la venta".
 */
export function PresentacionesInsumo({
  insumoId,
  presentaciones,
}: {
  insumoId: number;
  presentaciones: Presentacion[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-mono text-xs tracking-wide text-texto-suave uppercase">
        Presentaciones a la venta
      </h3>
      {presentaciones.length === 0 ? (
        <p className="text-xs text-texto-suave">Todavía no se vende suelto.</p>
      ) : (
        presentaciones.map((presentacion) => (
          <FilaPresentacion key={presentacion.id} presentacion={presentacion} />
        ))
      )}
      <FormularioPresentacion insumoId={insumoId} />
    </div>
  );
}
```

- [ ] **Step 7: Cablear en Stock**

- `SeccionVerInventario.tsx`: importar `listarPresentaciones` de `@/lib/presentaciones`; sumarlo al `Promise.all` (`[filasSabores, insumos, presentaciones]`) y pasar `presentaciones={presentaciones}` a `<PanelStock>`.
- `PanelStock.tsx`: importar `type Presentacion` de `@/lib/presentaciones`; agregar la prop `presentaciones: Presentacion[]` y pasarla: `<TablaInsumos insumos={insumosFiltrados} presentaciones={presentaciones} esDuenio={esDuenio} />`.
- `TablaInsumos.tsx`: agregar la prop `presentaciones: Presentacion[]` y, en el `map`, pasar `presentaciones={presentaciones.filter((presentacion) => presentacion.insumoId === insumo.id)}` a `FilaInsumoExpandible`.
- `FilaInsumoExpandible.tsx`: agregar la prop `presentaciones: Presentacion[]`; importar `PresentacionesInsumo` de `@/modulos/presentaciones/componentes/PresentacionesInsumo` y `estadoDeInsumo` (con `type EstadoInsumo`) de `../alerta`. Reemplazar `const bajoMinimo = ...` y la `<Insignia>` de estado por:

```tsx
const INSIGNIA_INSUMO: Record<EstadoInsumo, { variante: "alerta" | "advertencia" | "ok"; texto: string }> = {
  negativo: { variante: "alerta", texto: "Negativo: recontar" },
  bajo: { variante: "advertencia", texto: "Reponer" },
  ok: { variante: "ok", texto: "Ok" },
};
```
(fuera del componente) y, dentro, `const insignia = INSIGNIA_INSUMO[estadoDeInsumo(insumo.cantidad, insumo.minimo)];` con `<Insignia variante={insignia.variante}>{insignia.texto}</Insignia>`. En la fila expandida, reemplazar `<FormularioEdicionInsumo insumo={insumo} />` por:

```tsx
<div className="flex flex-col gap-3">
  <FormularioEdicionInsumo insumo={insumo} />
  <PresentacionesInsumo insumoId={insumo.id} presentaciones={presentaciones} />
</div>
```

- [ ] **Step 8: `npm run verificar`**

Run: `npm run formato:arreglar && npm run verificar`
Expected: PASS.

- [ ] **Step 9: Probar a mano contra PRUEBAS**

`/inventario` → Insumos → expandir un insumo como dueño: agregar "Docena / 12", verla inactiva; ponerle precio y tildar "A la venta"; probar que `12,5` y el precio vacío con "A la venta" muestran el mensaje; ver que un insumo con stock negativo muestra "Negativo: recontar".

- [ ] **Step 10: Commit**

```bash
git add src/modulos/presentaciones src/modulos/inventario src/lib/presentaciones.ts
git commit -m "Editar las presentaciones de un insumo desde Stock"
```

---

### Task 7: Qué consume cada formato (pantalla)

**Files:**
- Modify: `src/modulos/inventario/tipos.ts`
- Create: `src/modulos/inventario/consultas/consumos.ts`
- Modify: `src/modulos/inventario/consultas/accionesFormatos.ts`
- Create: `src/modulos/inventario/componentes/ConsumoFormato.tsx`
- Modify: `src/modulos/inventario/componentes/SeccionFormatos.tsx`

**Interfaces:**
- Consumes: tabla `formato_insumos` (Tarea 2), `listarInsumos()` y `Insumo` (ya existen en el módulo).
- Produces: `ConsumoDeFormato = { formatoId; insumoId; insumoNombre; cantidad }`, `listarConsumosDeFormatos()`, acciones `agregarConsumo` y `quitarConsumo`.

- [ ] **Step 1: El tipo y el listado**

En `src/modulos/inventario/tipos.ts` agregar:

```ts
/** Cuánto de un insumo se lleva un formato al venderse con helado (ej. Cucurucho doble → Cono doble × 1). */
export type ConsumoDeFormato = {
  formatoId: number;
  insumoId: number;
  insumoNombre: string;
  cantidad: number;
};
```

Crear `src/modulos/inventario/consultas/consumos.ts`:

```ts
import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { ConsumoDeFormato } from "../tipos";

type FilaConsumo = {
  formato_id: number;
  insumo_id: number;
  cantidad: number;
  insumos: { nombre: string } | null;
};

export async function listarConsumosDeFormatos(): Promise<ConsumoDeFormato[]> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("formato_insumos")
    .select("formato_id, insumo_id, cantidad, insumos ( nombre )");

  return ((data as unknown as FilaConsumo[] | null) ?? []).map((fila) => ({
    formatoId: fila.formato_id,
    insumoId: fila.insumo_id,
    insumoNombre: fila.insumos?.nombre ?? "",
    cantidad: fila.cantidad,
  }));
}
```

- [ ] **Step 2: Las acciones**

Agregar al final de `src/modulos/inventario/consultas/accionesFormatos.ts`:

```ts
function enteroPositivo(valor: FormDataEntryValue | null): number | null {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

/** Si el formato ya consumía ese insumo, pisa la cantidad (upsert): es configuración, no stock. */
export async function agregarConsumo(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const formatoId = enteroPositivo(datos.get("formatoId"));
  const insumoId = enteroPositivo(datos.get("insumoId"));
  const cantidad = enteroPositivo(datos.get("cantidad"));
  if (formatoId === null || insumoId === null || cantidad === null) {
    return { error: "Elegí un insumo y una cantidad entera mayor a cero." };
  }

  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("formato_insumos")
    .upsert(
      { formato_id: formatoId, insumo_id: insumoId, cantidad },
      { onConflict: "formato_id,insumo_id" },
    );

  if (error) return { error: "No se pudo guardar lo que consume el formato." };

  revalidatePath("/inventario");
  return SIN_ERROR;
}

export async function quitarConsumo(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const formatoId = enteroPositivo(datos.get("formatoId"));
  const insumoId = enteroPositivo(datos.get("insumoId"));
  if (formatoId === null || insumoId === null) return { error: "Consumo inválido." };

  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("formato_insumos")
    .delete()
    .eq("formato_id", formatoId)
    .eq("insumo_id", insumoId);

  if (error) return { error: "No se pudo quitar el consumo." };

  revalidatePath("/inventario");
  return SIN_ERROR;
}
```

- [ ] **Step 3: El componente**

Crear `src/modulos/inventario/componentes/ConsumoFormato.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import type { ConsumoDeFormato, Insumo } from "../tipos";
import { agregarConsumo, quitarConsumo } from "../consultas/accionesFormatos";

const INICIAL = { error: null };

export function ConsumoFormato({
  formatoId,
  consumos,
  insumos,
  esDuenio,
}: {
  formatoId: number;
  consumos: ConsumoDeFormato[];
  insumos: Insumo[];
  esDuenio: boolean;
}) {
  const [estadoAgregar, accionAgregar, agregando] = useActionState(agregarConsumo, INICIAL);
  const [estadoQuitar, accionQuitar, quitando] = useActionState(quitarConsumo, INICIAL);
  // Solo insumos que se cuentan por unidad: un formato consume "1 cono", no "0,3 kg".
  const elegibles = insumos.filter((insumo) => insumo.activo && insumo.unidad === "u");

  return (
    <div className="flex flex-wrap items-center gap-2 pl-2 text-xs">
      <span className="text-texto-suave">Consume:</span>
      {consumos.length === 0 && <span className="text-texto-suave">nada</span>}
      {consumos.map((consumo) =>
        esDuenio ? (
          <form key={consumo.insumoId} action={accionQuitar} className="flex items-center gap-1">
            <input type="hidden" name="formatoId" value={formatoId} />
            <input type="hidden" name="insumoId" value={consumo.insumoId} />
            <span>
              {consumo.insumoNombre} × {consumo.cantidad}
            </span>
            <button
              type="submit"
              disabled={quitando}
              aria-label={`Quitar ${consumo.insumoNombre}`}
              className="text-texto-suave hover:text-alerta"
            >
              ✕
            </button>
          </form>
        ) : (
          <span key={consumo.insumoId}>
            {consumo.insumoNombre} × {consumo.cantidad}
          </span>
        ),
      )}

      {esDuenio && (
        <form action={accionAgregar} className="flex items-center gap-1">
          <input type="hidden" name="formatoId" value={formatoId} />
          <select
            name="insumoId"
            aria-label="Insumo que consume"
            disabled={agregando}
            className="rounded-(--r) border border-linea bg-superficie px-2 py-1"
          >
            {elegibles.map((insumo) => (
              <option key={insumo.id} value={insumo.id}>
                {insumo.nombre}
              </option>
            ))}
          </select>
          <input
            type="number"
            name="cantidad"
            min="1"
            defaultValue={1}
            aria-label="Cantidad"
            disabled={agregando}
            className="numero w-14 rounded-(--r) border border-linea bg-superficie px-2 py-1"
          />
          <button type="submit" disabled={agregando} className="underline opacity-70">
            Agregar
          </button>
        </form>
      )}

      {(estadoAgregar.error || estadoQuitar.error) && (
        <span role="alert" className="text-alerta">
          {estadoAgregar.error ?? estadoQuitar.error}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Cablear en la sección de formatos**

Reemplazar `src/modulos/inventario/componentes/SeccionFormatos.tsx` por:

```tsx
import { listarFormatos } from "@/lib/formatos";
import { Tarjeta } from "@/componentes/Tarjeta";
import { listarConsumosDeFormatos } from "../consultas/consumos";
import { listarInsumos } from "../consultas/insumos";
import { ConsumoFormato } from "./ConsumoFormato";
import { FilaFormato } from "./FilaFormato";

export async function SeccionFormatos({ esDuenio }: { esDuenio: boolean }) {
  const [formatos, consumos, insumos] = await Promise.all([
    listarFormatos(),
    listarConsumosDeFormatos(),
    listarInsumos(),
  ]);

  return (
    <Tarjeta compacta>
      <header>
        <h2 className="font-display text-base font-semibold">Formatos</h2>
        <p className="text-xs text-texto-suave">
          Cucurucho, vasito, 1/4, 1/2, kilo: mismo precio sin importar el sabor.
        </p>
      </header>

      {formatos.length === 0 ? (
        <p className="text-sm text-texto-suave">Todavía no hay formatos cargados.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {formatos.map((formato) => (
            <div key={formato.id} className="flex flex-col gap-1">
              <FilaFormato formato={formato} esDuenio={esDuenio} />
              <ConsumoFormato
                formatoId={formato.id}
                consumos={consumos.filter((consumo) => consumo.formatoId === formato.id)}
                insumos={insumos}
                esDuenio={esDuenio}
              />
            </div>
          ))}
        </div>
      )}
    </Tarjeta>
  );
}
```

- [ ] **Step 5: `npm run verificar`**

Run: `npm run formato:arreglar && npm run verificar`
Expected: PASS.

- [ ] **Step 6: Probar a mano contra PRUEBAS**

`/inventario` → Ver → Formatos como dueño: a un formato agregarle "Cono × 1", ver que aparece, quitarlo, volver a agregarlo con cantidad 2 (pisa). Como colaborador: se ve "Consume: …" sin botones. Luego, en `/ventas`, vender ese formato y ver que el stock del cono baja lo configurado.

- [ ] **Step 7: Commit**

```bash
git add src/modulos/inventario
git commit -m "Configurar qué insumos consume cada formato"
```

---

### Task 8: Carga inicial de las dos listas de Goro

**Files:**
- Create: `supabase/carga_productos_goro.sql`
- Modify: `src/lib/codigos/codigo.test.ts`

**Interfaces:**
- Consumes: migraciones 1 y 2 aplicadas; `siguiente_numero_insumo()`.
- Produces: insumos (conos y productos de reventa) con código `GA` válido, sus presentaciones x1 y x12, los seis formatos de la lista 2 y su consumo. Todo inactivo y sin precio.

- [ ] **Step 1: Fijar el dígito verificador con un test**

El script calcula el verificador en SQL. Para que no se desincronice de `digitoVerificador`, agregar a `src/lib/codigos/codigo.test.ts`, dentro del `describe("generarCodigo", ...)`:

```ts
  it("códigos de artículo conocidos, los mismos que calcula el script de carga en SQL", () => {
    expect(generarCodigo("A", 1)).toBe("GA0000014");
    expect(generarCodigo("A", 12)).toBe("GA0000120");
    expect(generarCodigo("A", 345)).toBe("GA0003459");
  });
```

Run: `npx vitest run src/lib/codigos/codigo.test.ts`
Expected: PASS (son los valores que ya calcula `generarCodigo`; el test los deja escritos para comparar con el SQL en el Step 3).

- [ ] **Step 2: Escribir el script**

Crear `supabase/carga_productos_goro.sql`:

```sql
-- ============================================================================
-- Carga inicial de las dos listas que mandó Goro (2026-09-29).
-- NO es una migración versionada: es un script aparte que se corre una vez a
-- mano, como seed_ejemplo.sql. Se puede volver a correr sin duplicar nada.
--
-- Todo entra INACTIVO y SIN PRECIO: Goro completa los precios después desde
-- Inventario. Los mínimos y costos quedan en 0 por el mismo motivo.
--
-- Supuestos para confirmar con Goro (se corrigen desde Stock, sin código):
--  * hay cinco conos distintos: simple, doble, canasta, dulce y cucuruchón;
--  * el vasito simple (1 bocha) no consume ningún cono.
-- Bocha = 65 g: los dobles pesan 130 g y llevan 2 sabores.
-- ============================================================================

-- Mismo cálculo que digitoVerificador() en src/lib/codigos/codigo.ts: tipo A
-- pesa 1, y las posiciones pares (contando el tipo como la 0) pesan 3.
create function pg_temp.codigo_articulo(p_numero integer)
returns text
language plpgsql
as $$
declare
  v_secuencia text := lpad(p_numero::text, 6, '0');
  v_suma integer := 3;  -- el tipo (peso 1) en posición 0, que pesa 3
  i integer;
begin
  for i in 1..6 loop
    v_suma := v_suma + substr(v_secuencia, i, 1)::integer * case when i % 2 = 1 then 1 else 3 end;
  end loop;
  return 'GA' || v_secuencia || ((10 - v_suma % 10) % 10)::text;
end;
$$;

-- Comprobación: tiene que dar GA0000014, GA0000120, GA0003459.
select pg_temp.codigo_articulo(1), pg_temp.codigo_articulo(12), pg_temp.codigo_articulo(345);

-- Insumos: cinco conos y los productos de reventa. El código se genera solo
-- para los que faltan, así volver a correr esto no gasta números de la secuencia.
insert into public.insumos (nombre, codigo, unidad, minimo, costo)
select v.nombre, pg_temp.codigo_articulo(public.siguiente_numero_insumo()), 'u', 0, 0
from (values
  ('Cono simple'),
  ('Cono doble'),
  ('Canasta'),
  ('Cono dulce'),
  ('Cono cucuruchón dulce'),
  ('Bombón'),
  ('Palito'),
  ('Sándwich'),
  ('Cono bañado'),
  ('Cremita'),
  ('Vasito 100 g')
) as v(nombre)
where not exists (select 1 from public.insumos i where i.nombre = v.nombre);

-- Presentaciones: x1 y x12 de cada uno, inactivas y a $0 hasta que Goro ponga precio.
insert into public.presentaciones_insumo (insumo_id, nombre, unidades)
select i.id, p.nombre, p.unidades
from public.insumos i
cross join (values ('Unidad', 1), ('Docena', 12)) as p(nombre, unidades)
where i.nombre in (
  'Cono simple', 'Cono doble', 'Canasta', 'Cono dulce', 'Cono cucuruchón dulce',
  'Bombón', 'Palito', 'Sándwich', 'Cono bañado', 'Cremita', 'Vasito 100 g'
)
on conflict (insumo_id, unidades) do nothing;

-- Formatos de la lista 2. Inactivos y a $0.
insert into public.formatos (nombre, gramos, cantidad_sabores, precio, activo) values
  ('Cucurucho simple',   65,  1, 0, false),
  ('Cucurucho doble',    130, 2, 0, false),
  ('Canasta doble',      130, 2, 0, false),
  ('Cucurucho dulce',    130, 2, 0, false),
  ('Vasito simple',      65,  1, 0, false),
  ('Cucuruchón dulce',   130, 2, 0, false)
on conflict (nombre) do nothing;

-- Qué cono se lleva cada formato. El vasito simple no consume nada.
insert into public.formato_insumos (formato_id, insumo_id, cantidad)
select f.id, i.id, 1
from (values
  ('Cucurucho simple', 'Cono simple'),
  ('Cucurucho doble',  'Cono doble'),
  ('Canasta doble',    'Canasta'),
  ('Cucurucho dulce',  'Cono dulce'),
  ('Cucuruchón dulce', 'Cono cucuruchón dulce')
) as c(formato, insumo)
join public.formatos f on f.nombre = c.formato
join public.insumos i on i.nombre = c.insumo
on conflict (formato_id, insumo_id) do nothing;

-- Para mirar el resultado: 11 insumos nuevos, 22 presentaciones, 6 formatos, 5 consumos.
select i.codigo, i.nombre, count(p.id) as presentaciones
from public.insumos i
left join public.presentaciones_insumo p on p.insumo_id = i.id
where i.nombre in (
  'Cono simple', 'Cono doble', 'Canasta', 'Cono dulce', 'Cono cucuruchón dulce',
  'Bombón', 'Palito', 'Sándwich', 'Cono bañado', 'Cremita', 'Vasito 100 g'
)
group by i.codigo, i.nombre
order by i.codigo;
```

- [ ] **Step 3: Correrlo en PRUEBAS (lo hace Enzo) y comparar**

Pegar el script en el SQL Editor del proyecto de **pruebas** y ejecutar. Verificar: (a) el primer `select` da `GA0000014`, `GA0000120`, `GA0003459` (si no, el SQL y el TS discrepan: **parar** y corregir el SQL); (b) el `select` final lista 11 insumos con 2 presentaciones cada uno. Volver a correrlo: no debe agregar nada.

- [ ] **Step 4: Commit**

```bash
git add supabase/carga_productos_goro.sql src/lib/codigos/codigo.test.ts
git commit -m "Agregar el script de carga de las listas de Goro"
```

---

### Task 9: Cierre — pasar a producción, documentación y bitácora

**Files:**
- Modify: `supabase/README.md`
- Modify: `BITACORA.md`
- Modify: `ROADMAP.md`

- [ ] **Step 1: Pasada final**

Run: `npm run formato:arreglar && npm run verificar`
Expected: PASS. Y los tests de base, contra pruebas: `npx vitest run src/modulos/presentaciones/rls.test.ts src/modulos/ventas/rls.test.ts src/modulos/inventario/rls.test.ts` → todos PASS (el de inventario confirma que nada de lo viejo se rompió).

- [ ] **Step 2: Pasar a producción (lo hace Enzo, solo con su OK explícito)**

En el SQL Editor del proyecto **real**, en este orden y de a una, confirmando cada una: `20260929100000_presentaciones_insumo.sql`, `20260929110000_formato_insumos.sql`, `20260929120000_tipos_movimiento_venta.sql`, `20260929130000_venta_de_productos.sql`, y por último `supabase/carga_productos_goro.sql`. Después, en `/ventas` del sistema real, hacer una venta de prueba de un formato ya existente y anularla: confirma que `registrar_venta` sigue andando con lo que ya había.

- [ ] **Step 3: Registrar las migraciones**

En `supabase/README.md`, agregar cuatro filas a la tabla (con ✅ solo las que Enzo confirmó en el proyecto real):

```
| `20260929100000_presentaciones_insumo.sql`   | ✅ |
| `20260929110000_formato_insumos.sql`         | ✅ |
| `20260929120000_tipos_movimiento_venta.sql`  | ✅ |
| `20260929130000_venta_de_productos.sql`      | ✅ |
```

- [ ] **Step 4: Bitácora y roadmap**

Agregar arriba de todo en `BITACORA.md` (formato del archivo) la entrada `2026-09-29 — Productos por unidad, conos y formatos "sin helado"`: qué se hizo (presentaciones, consumo de conos, venta y anulación de productos), qué se decidió (extender `insumos` en vez de una tabla `productos`; "sin helado" = vender el cono como producto, sin columna aparte; stock negativo no bloquea; el helado del vasito de 100 g no se descuenta de ningún balde — costo aceptado), y qué queda pendiente (Goro completa precios, mínimos y costos; confirmar los cinco conos; baldes de 10 L y 5 L; formato activo a $0). En `ROADMAP.md`, en la fila de la Fase 4, agregar "productos por unidad y conos (insumo suelto) aplicado".

- [ ] **Step 5: Commit**

`BITACORA.md` hoy está sin trackear y `ROADMAP.md` tiene cambios de una sesión anterior: **preguntarle a Enzo** si los incluye en este commit. Si no, commitear solo el README de supabase.

```bash
git add supabase/README.md
git commit -m "Registrar las migraciones de productos por unidad"
```
