# Fase 2b — Catálogo (formatos y precios): Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir la tabla `formatos` (cucurucho, vasito, 1/4, 1/2, kilo,
etc.) como catálogo editable desde una pantalla — mismo precio sin importar
el sabor, alta/edición/borrado solo para el dueño, visible para cualquier
sesión activa.

**Architecture:** Una sección nueva (`SeccionFormatos`) dentro del módulo
existente `src/modulos/inventario/` y de la página `/inventario` — no un
módulo ni una ruta nueva. Una sola migración SQL con la tabla `formatos` y
su RLS. Las Server Actions de formatos van en un archivo propio
(`accionesFormatos.ts`), separado de `acciones.ts` porque ese archivo ya
está cerca del límite de 200 líneas.

**Tech Stack:** Next.js App Router (Server Components + Server Actions),
Supabase (Postgres, RLS), TypeScript, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-21-catalogo-formatos-design.md`

## Global Constraints

- Todo en español: tablas, columnas, funciones, variables, mensajes de error (AGENTS.md).
- 200 líneas por archivo, 100 por función — lo corta ESLint (AGENTS.md). Los archivos de test tienen techo de 400 líneas (`eslint.config.mjs`).
- Ningún color literal fuera de `src/estilos/tema.css` (AGENTS.md).
- Toda validación de negocio existe también como `check` en la columna (AGENTS.md / prompt base regla 4).
- Ninguna migración se aplica sola: se escribe el archivo y el usuario la corre a mano en el SQL Editor de Supabase (histórico de Núcleo e Inventario).
- `npm run verificar` (formato + lint + typecheck + tests unitarios) tiene que pasar antes de cada commit.
- `rls.test.ts` no corre en CI todavía (falta `SUPABASE_PRUEBAS`) — se sigue escribiendo igual, como red de seguridad.
- La autorización real de cada Server Action es RLS, no un chequeo de rol en TypeScript — la acción solo traduce el rechazo de Postgres a un mensaje (spec, sección "Notas de buenas prácticas de frontend").
- `SeccionFormatos` es Server Component (sin `"use client"`); solo los formularios interactivos (`FormularioFormato`, `FilaFormato`) lo son.

---

### Task 1: Migración SQL — tabla `formatos` y RLS

**Files:**
- Create: `supabase/migrations/20260921090000_catalogo.sql`
- Modify: `supabase/README.md`
- Modify: `ROADMAP.md`

**Interfaces:**
- Produces (para el resto del plan): tabla `formatos` (columnas `id`,
  `nombre`, `gramos`, `cantidad_sabores`, `precio`, `activo`, `creado_en`).
  No existe todavía en el código — las tareas siguientes la consumen por
  nombre exacto.

- [ ] **Step 1: Escribir la migración completa**

```sql
-- ============================================================================
-- Catálogo: formatos (cucurucho, vasito, 1/4, 1/2, kilo...).
-- ============================================================================
-- Mismo criterio que las migraciones anteriores: RLS activa desde la
-- creación, grant explícito a authenticated, revoke de anon.
--
-- A diferencia de `sabores`/`insumos`, acá SÍ se otorga `delete`: un formato
-- creado por error tiene que poder desaparecer. No hace falta proteger el
-- borrado de un formato con ventas encima "a mano" — el día que Fase 4
-- agregue `formato_id integer not null references public.formatos (id)` en
-- la línea de venta, esa foreign key (sin `on delete cascade`) va a
-- rechazar sola cualquier intento de borrar un formato ya usado. `activo`
-- pasa a ser el único camino para retirarlo recién en ese momento.
-- ============================================================================
create table public.formatos (
  id                integer generated always as identity primary key,
  nombre            text not null unique,
  gramos            integer not null,
  cantidad_sabores  integer not null,
  precio            integer not null,
  activo            boolean not null default true,
  creado_en         timestamptz not null default now(),
  constraint nombre_no_vacio check (length(trim(nombre)) > 0),
  constraint gramos_positivo check (gramos > 0),
  constraint cantidad_sabores_positiva check (cantidad_sabores >= 1),
  constraint precio_no_negativo check (precio >= 0)
);

alter table public.formatos enable row level security;
grant select, insert, delete on public.formatos to authenticated;
grant update (nombre, gramos, cantidad_sabores, precio, activo) on public.formatos to authenticated;
revoke all on public.formatos from anon;

create policy "formatos: cualquier sesion activa lee"
  on public.formatos for select to authenticated
  using (public.auth_rol() is not null);

create policy "formatos: solo el dueño da de alta"
  on public.formatos for insert to authenticated
  with check (public.es_duenio());

create policy "formatos: solo el dueño edita"
  on public.formatos for update to authenticated
  using (public.es_duenio())
  with check (public.es_duenio());

create policy "formatos: solo el dueño borra"
  on public.formatos for delete to authenticated
  using (public.es_duenio());
```

- [ ] **Step 2: Actualizar el checklist de migraciones en `supabase/README.md`**

Buscar esta tabla:

```markdown
| Migración                      | Aplicada |
| ------------------------------ | -------- |
| `20260912120000_nucleo.sql`    | ✅       |
| `20260919130000_inventario.sql`| ✅       |
```

Y agregar la fila nueva (sin marcar, todavía no se aplicó):

```markdown
| Migración                      | Aplicada |
| ------------------------------ | -------- |
| `20260912120000_nucleo.sql`    | ✅       |
| `20260919130000_inventario.sql`| ✅       |
| `20260921090000_catalogo.sql`  | ⬜       |
```

- [ ] **Step 3: Anotar el estado en `ROADMAP.md`**

Buscar la fila de "Sistema real" en la sección "0. Dónde estamos hoy":

```markdown
| Sistema real                   | Núcleo aplicado: ingreso por usuario, roles, RLS, menú por rol. Inventario (sabores, insumos, baldes) aplicado. |
```

Reemplazar por:

```markdown
| Sistema real                   | Núcleo aplicado: ingreso por usuario, roles, RLS, menú por rol. Inventario (sabores, insumos, baldes) aplicado. Catálogo (formatos) escrito, falta aplicar la migración. |
```

Y en la tabla de "Fases de construcción", la fila **2b**:

```markdown
| **2b** | **Catálogo** — formatos y precios editables                                                    | Goro crea el formato "Pote 2 kg, 6 sabores", le pone precio, y esa misma tarde aparece en el mostrador sin que nadie toque código                                                                                              |
```

Reemplazar por:

```markdown
| **2b** | **Catálogo** — formatos y precios editables ← _escrito, falta aplicar la migración_            | Goro crea el formato "Pote 2 kg, 6 sabores", le pone precio, y esa misma tarde aparece en el mostrador sin que nadie toque código                                                                                              |
```

- [ ] **Step 4: Verificar y commitear**

```bash
npm run verificar
git add supabase/migrations/20260921090000_catalogo.sql supabase/README.md ROADMAP.md
git commit -m "Escribir migración de Catálogo: tabla formatos"
```

`npm run verificar` no toca SQL, pero confirma que nada de Markdown/TS quedó
roto. La migración en sí se valida recién en el Task 5, cuando el usuario la
aplica a mano.

---

### Task 2: Formatos — tipos, consultas, acciones y UI

**Files:**
- Modify: `src/modulos/inventario/tipos.ts` (agregar `type Formato`)
- Create: `src/modulos/inventario/consultas/formatos.ts`
- Create: `src/modulos/inventario/consultas/accionesFormatos.ts`
- Create: `src/modulos/inventario/componentes/FormularioFormato.tsx`
- Create: `src/modulos/inventario/componentes/FilaFormato.tsx`
- Create: `src/modulos/inventario/componentes/SeccionFormatos.tsx`

**Interfaces:**
- Consumes: `EstadoFormulario` de `./acciones` (ya existe, Fase 2);
  `clienteServidor()` de `@/lib/supabase/servidor`; `Boton` de
  `@/componentes/Boton`; `Campo` de `@/componentes/Campo`;
  `useAccionConReset` de `@/lib/useAccionConReset`; tabla `formatos` (Task 1).
- Produces: `type Formato = { id, nombre, gramos, cantidadSabores, precio,
  activo }`; `listarFormatos(): Promise<Formato[]>`; Server Actions
  `crearFormato`, `editarFormato`, `eliminarFormato` (firma `(prev:
  EstadoFormulario, datos: FormData) => Promise<EstadoFormulario>`);
  componente `<SeccionFormatos esDuenio={boolean} />` — lo usa `page.tsx` en
  el Task 3.

- [ ] **Step 1: Agregar el tipo a `tipos.ts`**

Agregar al final de `src/modulos/inventario/tipos.ts`:

```typescript
export type Formato = {
  id: number;
  nombre: string;
  gramos: number;
  cantidadSabores: number;
  precio: number;
  activo: boolean;
};
```

- [ ] **Step 2: Escribir `consultas/formatos.ts`**

```typescript
import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { Formato } from "../tipos";

type FilaFormato = {
  id: number;
  nombre: string;
  gramos: number;
  cantidad_sabores: number;
  precio: number;
  activo: boolean;
};

function mapearFormato(fila: FilaFormato): Formato {
  return {
    id: fila.id,
    nombre: fila.nombre,
    gramos: fila.gramos,
    cantidadSabores: fila.cantidad_sabores,
    precio: fila.precio,
    activo: fila.activo,
  };
}

/** Todos los formatos, activos primero. RLS ya limita esto a cualquier sesión activa. */
export async function listarFormatos(): Promise<Formato[]> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("formatos")
    .select("id, nombre, gramos, cantidad_sabores, precio, activo")
    .order("activo", { ascending: false })
    .order("nombre");

  return ((data as FilaFormato[] | null) ?? []).map(mapearFormato);
}
```

- [ ] **Step 3: Escribir `consultas/accionesFormatos.ts`**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { EstadoFormulario } from "./acciones";

const SIN_ERROR: EstadoFormulario = { error: null };

/** Validaciones compartidas por crear y editar, separadas para no pasar el límite de complejidad del linter. */
function validarDatosFormato(
  nombre: string,
  gramos: number,
  cantidadSabores: number,
  precio: number,
): string | null {
  if (!nombre) return "Escribí un nombre.";
  if (!Number.isInteger(gramos) || gramos <= 0) {
    return "Los gramos tienen que ser un número entero mayor a cero.";
  }
  if (!Number.isInteger(cantidadSabores) || cantidadSabores < 1) {
    return "La cantidad de sabores tiene que ser al menos 1.";
  }
  if (!Number.isInteger(precio) || precio < 0) return "El precio tiene que ser un número entero positivo.";
  return null;
}

export async function crearFormato(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const nombre = String(datos.get("nombre") ?? "").trim();
  const gramos = Number(datos.get("gramos"));
  const cantidadSabores = Number(datos.get("cantidadSabores"));
  const precio = Number(datos.get("precio"));

  const errorValidacion = validarDatosFormato(nombre, gramos, cantidadSabores, precio);
  if (errorValidacion) return { error: errorValidacion };

  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("formatos")
    .insert({ nombre, gramos, cantidad_sabores: cantidadSabores, precio });

  if (error) {
    if (error.code === "23505") return { error: `Ya existe un formato "${nombre}".` };
    return { error: "No se pudo crear el formato." };
  }

  revalidatePath("/inventario");
  return SIN_ERROR;
}

export async function editarFormato(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const formatoId = Number(datos.get("formatoId"));
  const nombre = String(datos.get("nombre") ?? "").trim();
  const gramos = Number(datos.get("gramos"));
  const cantidadSabores = Number(datos.get("cantidadSabores"));
  const precio = Number(datos.get("precio"));
  const activo = datos.get("activo") === "on";

  const errorValidacion = validarDatosFormato(nombre, gramos, cantidadSabores, precio);
  if (errorValidacion) return { error: errorValidacion };

  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("formatos")
    .update({ nombre, gramos, cantidad_sabores: cantidadSabores, precio, activo })
    .eq("id", formatoId);

  if (error) {
    if (error.code === "23505") return { error: `Ya existe un formato "${nombre}".` };
    return { error: "No se pudo guardar el formato." };
  }

  revalidatePath("/inventario");
  return SIN_ERROR;
}

export async function eliminarFormato(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const formatoId = Number(datos.get("formatoId"));
  if (!Number.isInteger(formatoId) || formatoId <= 0) return { error: "Formato inválido." };

  const supabase = await clienteServidor();
  const { error } = await supabase.from("formatos").delete().eq("id", formatoId);

  if (error) return { error: "No se pudo borrar el formato. ¿Tiene ventas asociadas?" };

  revalidatePath("/inventario");
  return SIN_ERROR;
}
```

- [ ] **Step 4: Escribir `componentes/FormularioFormato.tsx`**

```tsx
"use client";

import { Boton } from "@/componentes/Boton";
import { Campo } from "@/componentes/Campo";
import { useAccionConReset } from "@/lib/useAccionConReset";
import { crearFormato } from "../consultas/accionesFormatos";

const INICIAL = { error: null };

export function FormularioFormato() {
  const { estado, accion, enviando, formRef } = useAccionConReset(crearFormato, INICIAL);

  return (
    <form ref={formRef} action={accion} className="flex flex-wrap items-end gap-2">
      <Campo id="nombre-formato" name="nombre" etiqueta="Formato nuevo" required />
      <Campo id="gramos-formato" name="gramos" etiqueta="Gramos" type="number" min="1" required />
      <Campo
        id="cantidad-sabores-formato"
        name="cantidadSabores"
        etiqueta="Cant. sabores"
        type="number"
        min="1"
        required
      />
      <Campo id="precio-formato" name="precio" etiqueta="Precio" type="number" min="0" required />
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

- [ ] **Step 5: Escribir `componentes/FilaFormato.tsx`**

```tsx
"use client";

import { useActionState } from "react";
import type { Formato } from "../tipos";
import { editarFormato, eliminarFormato } from "../consultas/accionesFormatos";

const INICIAL = { error: null };

export function FilaFormato({ formato, esDuenio }: { formato: Formato; esDuenio: boolean }) {
  const [estadoEdicion, accionEditar, editando] = useActionState(editarFormato, INICIAL);
  const [estadoBorrado, accionBorrar, borrando] = useActionState(eliminarFormato, INICIAL);

  if (!esDuenio) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-(--r) border border-linea p-3 text-sm">
        <span className="font-semibold">{formato.nombre}</span>
        <span className="text-texto-suave">{formato.gramos} g</span>
        <span className="text-texto-suave">{formato.cantidadSabores} sabores</span>
        <span className="numero">${formato.precio}</span>
        {!formato.activo && <span className="text-xs text-texto-suave">(inactivo)</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-(--r) border border-linea p-3">
      <form action={accionEditar} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="formatoId" value={formato.id} />
        <input
          type="text"
          name="nombre"
          defaultValue={formato.nombre}
          aria-label="Nombre"
          disabled={editando}
          className="rounded-(--r) border border-linea bg-superficie px-2 py-1 text-sm"
        />
        <input
          type="number"
          name="gramos"
          min="1"
          defaultValue={formato.gramos}
          aria-label="Gramos"
          disabled={editando}
          className="numero w-20 rounded-(--r) border border-linea bg-superficie px-2 py-1 text-sm"
        />
        <input
          type="number"
          name="cantidadSabores"
          min="1"
          defaultValue={formato.cantidadSabores}
          aria-label="Cantidad de sabores"
          disabled={editando}
          className="numero w-16 rounded-(--r) border border-linea bg-superficie px-2 py-1 text-sm"
        />
        <input
          type="number"
          name="precio"
          min="0"
          defaultValue={formato.precio}
          aria-label="Precio"
          disabled={editando}
          className="numero w-24 rounded-(--r) border border-linea bg-superficie px-2 py-1 text-sm"
        />
        <label className="flex items-center gap-1 text-xs">
          <input type="checkbox" name="activo" defaultChecked={formato.activo} disabled={editando} />
          Activo
        </label>
        <button type="submit" disabled={editando} className="text-xs underline opacity-70">
          {editando ? "Guardando…" : "Guardar"}
        </button>
        {estadoEdicion.error && (
          <span role="alert" className="text-xs text-alerta">
            {estadoEdicion.error}
          </span>
        )}
      </form>

      <form
        action={accionBorrar}
        onSubmit={(evento) => {
          if (!confirm(`¿Borrar el formato "${formato.nombre}"?`)) evento.preventDefault();
        }}
        className="flex items-center gap-2"
      >
        <input type="hidden" name="formatoId" value={formato.id} />
        <button type="submit" disabled={borrando} className="text-xs text-alerta underline">
          {borrando ? "Borrando…" : "Borrar"}
        </button>
        {estadoBorrado.error && (
          <span role="alert" className="text-xs text-alerta">
            {estadoBorrado.error}
          </span>
        )}
      </form>
    </div>
  );
}
```

- [ ] **Step 6: Escribir `componentes/SeccionFormatos.tsx`**

```tsx
import { listarFormatos } from "../consultas/formatos";
import { FilaFormato } from "./FilaFormato";
import { FormularioFormato } from "./FormularioFormato";

export async function SeccionFormatos({ esDuenio }: { esDuenio: boolean }) {
  const formatos = await listarFormatos();

  return (
    <section className="flex flex-col gap-4 rounded-(--r-grande) border border-linea bg-superficie p-6">
      <header>
        <h2 className="font-display text-lg font-semibold">Formatos</h2>
        <p className="text-sm text-texto-suave">
          Cucurucho, vasito, 1/4, 1/2, kilo: mismo precio sin importar el sabor.
        </p>
      </header>

      {formatos.length === 0 ? (
        <p className="text-sm text-texto-suave">Todavía no hay formatos cargados.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {formatos.map((formato) => (
            <FilaFormato key={formato.id} formato={formato} esDuenio={esDuenio} />
          ))}
        </div>
      )}

      {esDuenio && <FormularioFormato />}
    </section>
  );
}
```

- [ ] **Step 7: Verificar y commitear**

```bash
npm run verificar
git add src/modulos/inventario/tipos.ts src/modulos/inventario/consultas/formatos.ts src/modulos/inventario/consultas/accionesFormatos.ts src/modulos/inventario/componentes/FormularioFormato.tsx src/modulos/inventario/componentes/FilaFormato.tsx src/modulos/inventario/componentes/SeccionFormatos.tsx
git commit -m "Agregar Formatos: catálogo editable con alta, edición y borrado"
```

`npm run verificar` no puede probar contra una base real todavía (la
migración no está aplicada) — lo que confirma acá es que todo tipa y lintea
limpio. La prueba real es el Task 5.

---

### Task 3: Montar `SeccionFormatos` en la página `/inventario`

**Files:**
- Modify: `src/app/(app)/inventario/page.tsx`

**Interfaces:**
- Consumes: `SeccionFormatos` (Task 2).
- Produces: nada que otra tarea consuma — es el punto donde la sección se
  vuelve visible.

- [ ] **Step 1: Agregar el import y el componente**

Archivo completo de `src/app/(app)/inventario/page.tsx`:

```tsx
import { exigirPerfil } from "@/modulos/auth/consultas/perfil";
import { SeccionBaldes } from "@/modulos/inventario/componentes/SeccionBaldes";
import { SeccionFormatos } from "@/modulos/inventario/componentes/SeccionFormatos";
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
        <p className="text-texto-suave">Sabores, baldes, insumos y formatos.</p>
      </header>

      <SeccionSabores esDuenio={esDuenio} />
      <SeccionBaldes />
      <SeccionInsumos esDuenio={esDuenio} />
      <SeccionFormatos esDuenio={esDuenio} />
    </div>
  );
}
```

- [ ] **Step 2: Verificar y commitear**

```bash
npm run verificar
git add "src/app/(app)/inventario/page.tsx"
git commit -m "Montar la sección de Formatos en la página de Inventario"
```

---

### Task 4: `rls.test.ts` — casos de Formatos

**Files:**
- Modify: `src/modulos/inventario/rls.test.ts`

**Interfaces:**
- Consumes: tabla `formatos` (Task 1), vía los clientes `duenio.cliente` /
  `colaborador.cliente` / `anonimo` / `servicio` ya creados en el
  `beforeAll` existente del archivo.
- Produces: nada que otra tarea consuma; es la red de seguridad del catálogo.

- [ ] **Step 1: Agregar los casos nuevos**

Agregar, dentro del mismo `describe("RLS: inventario", ...)`, después del
último `it(...)` existente (justo antes del cierre `});` final del
`describe`):

```typescript
  it("un colaborador no puede crear un formato", async () => {
    const { error } = await colaborador.cliente
      .from("formatos")
      .insert({ nombre: "Formato de colaborador", gramos: 250, cantidad_sabores: 1, precio: 1000 });
    expect(error).not.toBeNull();
  });

  it("un colaborador no puede editar ni borrar un formato existente", async () => {
    const { data: formato } = await servicio
      .from("formatos")
      .insert({ nombre: `Formato ajeno ${Date.now()}`, gramos: 250, cantidad_sabores: 1, precio: 1000 })
      .select("id")
      .single();

    // RLS filtra por `using`, no tira error: la fila simplemente no matchea
    // y la operación "tiene éxito" sin tocar nada (mismo criterio que el
    // caso de insumos.costo más arriba en este archivo).
    await colaborador.cliente.from("formatos").update({ precio: 1 }).eq("id", formato!.id);
    const { data: trasEditar } = await servicio
      .from("formatos")
      .select("precio")
      .eq("id", formato!.id)
      .single();
    expect(trasEditar!.precio).toBe(1000);

    await colaborador.cliente.from("formatos").delete().eq("id", formato!.id);
    const { data: trasBorrar } = await servicio
      .from("formatos")
      .select("id")
      .eq("id", formato!.id)
      .maybeSingle();
    expect(trasBorrar).not.toBeNull();

    await servicio.from("formatos").delete().eq("id", formato!.id);
  });

  it("el dueño puede crear, editar y borrar un formato", async () => {
    const { data, error: errorAlta } = await duenio.cliente
      .from("formatos")
      .insert({ nombre: `Formato de prueba ${Date.now()}`, gramos: 250, cantidad_sabores: 1, precio: 1000 })
      .select("id")
      .single();
    expect(errorAlta).toBeNull();

    const { error: errorEdicion } = await duenio.cliente
      .from("formatos")
      .update({ precio: 1200 })
      .eq("id", data!.id);
    expect(errorEdicion).toBeNull();

    const { error: errorBorrado } = await duenio.cliente.from("formatos").delete().eq("id", data!.id);
    expect(errorBorrado).toBeNull();
  });

  it("sin sesión no se puede leer formatos", async () => {
    const { data, error } = await anonimo.from("formatos").select("id");
    expect(data).toEqual([]);
    expect(error).toBeNull();
  });
```

- [ ] **Step 2: Confirmar que el archivo sigue excluido del run normal**

Run: `npm run test:unit`
Expected: `rls.test.ts` no aparece en la lista de test files corridos (el
`--exclude "**/*.rls.test.ts"` de `package.json` ya lo filtra) y el resto de
la suite pasa igual.

- [ ] **Step 3: Verificar y commitear**

```bash
npm run verificar
git add src/modulos/inventario/rls.test.ts
git commit -m "Agregar casos de RLS de Formatos"
```

---

### Task 5: Verificación manual end-to-end

**Files:** ninguno (solo verificación manual + ajuste final de checklist)

**Interfaces:** ninguna — cierra la fase.

Este paso no lo hace un agente solo: necesita que una persona con acceso al
proyecto de Supabase real aplique la migración a mano.

- [ ] **Step 1: Pedirle al usuario que aplique la migración**

Mensaje para el usuario: "Abrí el SQL Editor de tu proyecto en supabase.com,
pegá el contenido completo de
`supabase/migrations/20260921090000_catalogo.sql`, y ejecutalo."

- [ ] **Step 2: Probar el entregable de la fase en el navegador**

Con `npm run dev` corriendo y sesión iniciada como `goro` (dueño):

1. Ir a "Inventario", bajar hasta "Formatos". Crear el formato "Pote 2 kg"
   con 2000 g, 6 sabores y precio 26000.
2. Confirmar que aparece en la lista inmediatamente (sin recargar a mano —
   `revalidatePath` ya lo actualiza).
3. Editarle el precio a 27000 desde la misma fila y guardar: confirmar que
   el valor nuevo queda.
4. Crear un segundo formato cualquiera "por error" y borrarlo con el botón
   "Borrar" (confirmar el diálogo del navegador): confirmar que desaparece
   de la lista.
5. Iniciar sesión como un usuario con rol `colaborador`: confirmar que ve
   la lista de formatos activos pero no ve ningún formulario de alta,
   edición ni borrado.

- [ ] **Step 3: Actualizar el checklist**

En `supabase/README.md`, cambiar:

```markdown
| `20260921090000_catalogo.sql`  | ⬜       |
```

por:

```markdown
| `20260921090000_catalogo.sql`  | ✅       |
```

En `ROADMAP.md`, en la fila de "Sistema real", cambiar:

```markdown
| Sistema real                   | Núcleo aplicado: ingreso por usuario, roles, RLS, menú por rol. Inventario (sabores, insumos, baldes) aplicado. Catálogo (formatos) escrito, falta aplicar la migración. |
```

por:

```markdown
| Sistema real                   | Núcleo aplicado: ingreso por usuario, roles, RLS, menú por rol. Inventario (sabores, insumos, baldes) aplicado. Catálogo (formatos) aplicado. |
```

Y en la fila **2b** de "Fases de construcción", cambiar:

```markdown
| **2b** | **Catálogo** — formatos y precios editables ← _escrito, falta aplicar la migración_            | Goro crea el formato "Pote 2 kg, 6 sabores", le pone precio, y esa misma tarde aparece en el mostrador sin que nadie toque código                                                                                              |
```

por:

```markdown
| **2b** | **Catálogo** — formatos y precios editables ← _aplicado_                                       | Goro crea el formato "Pote 2 kg, 6 sabores", le pone precio, y esa misma tarde aparece en el mostrador sin que nadie toque código                                                                                              |
```

- [ ] **Step 4: Commitear la actualización del checklist**

```bash
git add supabase/README.md ROADMAP.md
git commit -m "Marcar la migración de Catálogo como aplicada"
```

Con este paso, Fase 2b queda cerrada: el entregable del ROADMAP ("Goro crea
el formato... le pone precio, y esa misma tarde aparece... sin que nadie
toque código") es verificable de punta a punta.
