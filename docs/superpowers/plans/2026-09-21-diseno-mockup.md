# Rediseño visual (vocabulario del mockup): Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Portar el vocabulario visual del mockup (`index.html`) al sistema
real — arcos, tarjetas, insignias, cubeta con nivel de kilos — y el flujo de
interacción de Ventas (formato/sabor como botones, auto-agregado al
completar el cupo), sin romper ninguna funcionalidad ya construida y
verificada en Inventario y Ventas.

**Architecture:** Se construye primero el vocabulario de componentes
compartidos (`src/componentes/`) y una función pura nueva (`kgPorSabor`),
después se aplica módulo por módulo (`BarraLateral`, las cuatro secciones
de Inventario, Ventas). Es una reescritura de la capa de presentación: los
`consultas/`, las Server Actions de negocio, la RLS y las migraciones no
cambian, salvo una columna nueva (`sabores.color`) necesaria para que la
cubeta tenga sentido.

**Tech Stack:** Next.js App Router (Server Components + Server Actions),
Tailwind CSS v4, Supabase (Postgres, RLS), TypeScript, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-21-diseno-mockup-design.md`

## Global Constraints

- Todo en español: variables, funciones, comentarios (AGENTS.md).
- 200 líneas por archivo, 100 por función — lo corta ESLint. Tests: 400 líneas.
- Ningún color literal (`#hex`, `rgba()`) fuera de `src/estilos/tema.css` — con la única excepción de `sabores.color`, que es un dato de negocio (el color real de un sabor), no un token de diseño, y se maneja como cualquier otro valor de fila (nunca hardcodeado en un componente).
- Ninguna migración se aplica sola: se escribe el archivo y el usuario la corre a mano en el SQL Editor de Supabase.
- `npm run verificar` tiene que pasar antes de cada commit.
- Ningún cambio a `consultas/` de negocio, Server Actions de negocio, RLS ni funciones de Postgres existentes — solo la capa de presentación, salvo lo estrictamente necesario para `color`.
- La arquitectura de información de Inventario (secciones apiladas, sin tabs) no cambia — solo su vocabulario visual (spec, Decisión 3).

---

### Task 1: Migración — `sabores.color`

**Files:**
- Create: `supabase/migrations/20260921150000_color_sabor.sql`
- Modify: `supabase/README.md`

**Interfaces:**
- Produces: columna `sabores.color text not null default '#3F6B3A'` con
  `check` de formato hex. La consumen los Tasks 7 y 11.

- [ ] **Step 1: Escribir la migración**

```sql
-- ============================================================================
-- Color de sabor: dato de negocio, no un token de diseño. El mockup lo
-- describe así: "el color real de cada sabor es un dato del sistema y
-- aparece igual en todos lados". Sin esta columna, la cubeta no puede ser
-- fiel al mockup.
-- ============================================================================
alter table public.sabores
  add column color text not null default '#3F6B3A',
  add constraint color_formato_hex check (color ~ '^#[0-9a-fA-F]{6}$');
```

- [ ] **Step 2: Actualizar el checklist de migraciones en `supabase/README.md`**

Buscar:

```markdown
| `20260921120000_ventas.sql`    | ✅       |
```

Agregar la fila nueva debajo:

```markdown
| `20260921120000_ventas.sql`    | ✅       |
| `20260921150000_color_sabor.sql`| ⬜       |
```

- [ ] **Step 3: Verificar y commitear**

```bash
npm run verificar
git add supabase/migrations/20260921150000_color_sabor.sql supabase/README.md
git commit -m "Escribir migración de sabores.color"
```

---

### Task 2: Tokens nuevos en `tema.css` y `globals.css`

**Files:**
- Modify: `src/estilos/tema.css`
- Modify: `src/app/globals.css`

**Interfaces:**
- Produces: `--radio-chico`, `--arco`, `--sombra`, `--advertencia`,
  `--advertencia-fondo` (CSS vars); utilidades Tailwind
  `rounded-(--radius-arco)`, `shadow-(--shadow-tarjeta)`, `bg-advertencia`,
  `text-advertencia`, `bg-advertencia-fondo` — las usan los Tasks 4, 6, 8,
  9, 11 y 12.

- [ ] **Step 1: Agregar los tokens a `tema.css`**

Buscar el bloque `/* --- Forma --- */` al final del archivo:

```css
  /* --- Forma --- */
  --r: 10px; /* radio base */
  --r-grande: 18px; /* tarjetas y contenedores */
}
```

Reemplazar por:

```css
  /* --- Forma --- */
  --r: 10px; /* radio base */
  --r-grande: 18px; /* tarjetas y contenedores */

  /* El arco es el gesto estructural del mockup: píldora arriba, radio
     chico abajo. Va separado de --r porque son dos roles distintos, no
     el mismo radio en dos tamaños. */
  --radio-chico: 10px;
  --arco: 999px 999px var(--radio-chico) var(--radio-chico);

  /* Sombra: la única forma no-color que el mockup usa para dar
     profundidad. Un solo token, mismo criterio que los colores. */
  --sombra: 0 1px 0 rgba(42, 27, 18, 0.04), 0 8px 24px -18px rgba(42, 27, 18, 0.5);

  /* --- Advertencia: nivel intermedio entre "ok" y "alerta" — "reponer
     pronto", no "bloquea una venta ahora". Rol distinto de --destacado
     (que es para totales), aunque comparta el mismo color. --- */
  --advertencia: #c97b34;
  --advertencia-fondo: #f8ecd9;
}
```

- [ ] **Step 2: Cablear los tokens en `globals.css`**

Buscar:

```css
  --color-alerta: var(--alerta);
  --color-alerta-fondo: var(--alerta-fondo);

  --radius-base: var(--r);
  --radius-grande: var(--r-grande);
```

Reemplazar por:

```css
  --color-alerta: var(--alerta);
  --color-alerta-fondo: var(--alerta-fondo);
  --color-advertencia: var(--advertencia);
  --color-advertencia-fondo: var(--advertencia-fondo);

  --radius-base: var(--r);
  --radius-grande: var(--r-grande);
  --radius-arco: var(--arco);
  --shadow-tarjeta: var(--sombra);
```

- [ ] **Step 3: Verificar y commitear**

```bash
npm run verificar
git add src/estilos/tema.css src/app/globals.css
git commit -m "Agregar tokens de forma y advertencia para el vocabulario del mockup"
```

---

### Task 3: `Boton` (reescrito) y `Campo` (ajuste)

**Files:**
- Modify: `src/componentes/Boton.tsx`
- Modify: `src/componentes/Campo.tsx`

**Interfaces:**
- Produces: `<Boton variante?: "principal" | "suave" | "fantasma" | "peligro" tamano?: "normal" | "grande">` (antes solo tenía `principal`/`suave`, sin `tamano`) — todos los usos existentes de `<Boton>` (Sabores, Insumos, Baldes, Formatos, Ventas) siguen compilando porque los props nuevos son opcionales.

- [ ] **Step 1: Reescribir `Boton.tsx`**

```tsx
import type { ComponentProps } from "react";

type Props = ComponentProps<"button"> & {
  variante?: "principal" | "suave" | "fantasma" | "peligro";
  tamano?: "normal" | "grande";
};

const ESTILOS = {
  principal: "bg-acento text-acento-texto hover:brightness-110",
  suave: "bg-superficie text-texto border border-linea hover:bg-superficie-honda",
  fantasma: "text-texto-suave hover:bg-superficie-honda hover:text-texto",
  peligro: "bg-alerta-fondo text-alerta hover:bg-alerta hover:text-superficie",
} as const;

const TAMANOS = {
  normal: "px-4 py-2 text-sm",
  grande: "px-6 py-3 text-base",
} as const;

export function Boton({
  variante = "principal",
  tamano = "normal",
  className = "",
  ...resto
}: Props) {
  return (
    <button
      className={`rounded-full font-semibold transition disabled:opacity-45 ${ESTILOS[variante]} ${TAMANOS[tamano]} ${className}`}
      {...resto}
    />
  );
}
```

- [ ] **Step 2: Ajustar `Campo.tsx`** (la etiqueta pasa a `font-mono`, mismo
      criterio que el `.campo__et` del mockup — el radio ya coincidía)

```tsx
import type { ComponentProps } from "react";

type Props = ComponentProps<"input"> & { etiqueta: string };

export function Campo({ etiqueta, id, className = "", ...resto }: Props) {
  return (
    <label className="flex flex-col gap-1" htmlFor={id}>
      <span className="font-mono text-xs font-semibold tracking-wide text-texto-suave uppercase">
        {etiqueta}
      </span>
      <input
        id={id}
        className={`rounded-(--r) border border-linea bg-superficie px-3 py-2 text-texto outline-none focus-visible:border-acento ${className}`}
        {...resto}
      />
    </label>
  );
}
```

- [ ] **Step 3: Verificar y commitear**

```bash
npm run verificar
git add src/componentes/Boton.tsx src/componentes/Campo.tsx
git commit -m "Reescribir Boton como píldora y sumar variantes fantasma/peligro"
```

`npm run verificar` corre el typecheck de todo el árbol: si algún uso
existente de `<Boton>` se rompiera con los props nuevos, esto lo muestra.
La forma (píldora en vez de radio chico) es un cambio visible en **todos**
los botones del sistema ya construidos — es intencional, no un efecto
secundario.

---

### Task 4: Componentes nuevos — `Tarjeta`, `ArcoCab`, `Insignia`, `Punto`, `Cubeta`

**Files:**
- Create: `src/componentes/Tarjeta.tsx`
- Create: `src/componentes/ArcoCab.tsx`
- Create: `src/componentes/Insignia.tsx`
- Create: `src/componentes/Punto.tsx`
- Create: `src/componentes/Cubeta.tsx`

**Interfaces:**
- Produces: `<Tarjeta>` (envoltorio de sección, reemplaza el `<section>`
  repetido a mano); `<ArcoCab eyebrow titulo>` (cabecera oscura con forma
  de arco, para "unidades de trabajo" como el carrito de Ventas — no para
  cabeceras de sección de Inventario); `<Insignia variante="ok"|"advertencia"|"alerta"|"neutra">`;
  `<Punto color grande?>`; `<Cubeta pct color bajo?>`. Los usan los Tasks 6,
  8, 9, 10, 11, 12, 13.

Nota: el spec también menciona `Pildora` (botón toggle de filtro), pero
ningún task de este plan la necesita — no hay ningún filtro/buscador en
esta vuelta (el sistema real no tiene categorías de sabor como el mockup).
Se deja afuera para no construir código sin ningún consumidor; se agrega
el día que Ventas sume un buscador de sabores.

- [ ] **Step 1: Escribir `componentes/Tarjeta.tsx`**

```tsx
import type { ComponentProps } from "react";

export function Tarjeta({ className = "", ...resto }: ComponentProps<"section">) {
  return (
    <section
      className={`flex flex-col gap-4 rounded-(--r-grande) border border-linea bg-superficie p-6 shadow-(--shadow-tarjeta) ${className}`}
      {...resto}
    />
  );
}
```

- [ ] **Step 2: Escribir `componentes/ArcoCab.tsx`**

```tsx
import type { ReactNode } from "react";

export function ArcoCab({ eyebrow, titulo }: { eyebrow: string; titulo: ReactNode }) {
  return (
    <div className="rounded-(--radius-arco) bg-marco px-4 pt-4 pb-3 text-center">
      <p className="font-mono text-xs tracking-[0.14em] text-fondo/70 uppercase">{eyebrow}</p>
      <h3 className="font-display text-lg font-bold text-fondo">{titulo}</h3>
    </div>
  );
}
```

- [ ] **Step 3: Escribir `componentes/Insignia.tsx`**

```tsx
import type { ReactNode } from "react";

type Variante = "ok" | "advertencia" | "alerta" | "neutra";

const ESTILOS: Record<Variante, string> = {
  ok: "bg-ok-fondo text-ok",
  advertencia: "bg-advertencia-fondo text-advertencia",
  alerta: "bg-alerta-fondo text-alerta",
  neutra: "bg-superficie-honda text-texto-suave",
};

export function Insignia({ variante, children }: { variante: Variante; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-xs tracking-wide uppercase ${ESTILOS[variante]}`}
    >
      {children}
    </span>
  );
}
```

- [ ] **Step 4: Escribir `componentes/Punto.tsx`**

```tsx
export function Punto({ color, grande = false }: { color: string; grande?: boolean }) {
  return (
    <span
      className={`inline-block shrink-0 rounded-full border border-marco/20 align-[-2px] ${
        grande ? "h-[22px] w-[22px]" : "h-3.5 w-3.5"
      }`}
      style={{ backgroundColor: color }}
    />
  );
}
```

- [ ] **Step 5: Escribir `componentes/Cubeta.tsx`**

```tsx
export function Cubeta({
  pct,
  color,
  bajo = false,
}: {
  pct: number;
  color: string;
  bajo?: boolean;
}) {
  const pctAcotado = Math.max(0, Math.min(100, pct));

  return (
    <div
      role="img"
      aria-label={`Cubeta al ${Math.round(pctAcotado)} por ciento`}
      className={`relative h-11 w-9 shrink-0 overflow-hidden rounded-(--radius-arco) border bg-superficie-honda ${
        bajo ? "border-alerta shadow-[0_0_0_2px_var(--alerta-fondo)]" : "border-linea"
      }`}
    >
      <div
        className="absolute inset-x-0 bottom-0 transition-[height]"
        style={{ height: `${pctAcotado}%`, backgroundColor: color }}
      />
    </div>
  );
}
```

- [ ] **Step 6: Verificar y commitear**

```bash
npm run verificar
git add src/componentes/Tarjeta.tsx src/componentes/ArcoCab.tsx src/componentes/Insignia.tsx src/componentes/Punto.tsx src/componentes/Cubeta.tsx
git commit -m "Agregar Tarjeta, ArcoCab, Insignia, Punto y Cubeta"
```

Ninguno de estos componentes tiene consumidor todavía — `npm run verificar`
solo confirma que tipan y lintean limpio. Se usan a partir del Task 6.

---

### Task 5: `kgPorSabor` en `src/lib/baldes.ts` (TDD)

**Files:**
- Modify: `src/lib/baldes.ts`
- Create: `src/lib/baldes.test.ts`

**Interfaces:**
- Consumes: `type Balde` (ya existe en el mismo archivo).
- Produces: `kgPorSabor(baldes: Balde[]): Record<number, number>` — la usan
  los Tasks 8 y 11.

- [ ] **Step 1: Escribir el test (falla porque `kgPorSabor` no existe)**

```typescript
import { describe, expect, it } from "vitest";
import { kgPorSabor, type Balde } from "./baldes";

function balde(parcial: Partial<Balde>): Balde {
  return {
    id: 1,
    codigo: "GB0000001",
    saborId: 1,
    kgInicial: 10,
    kgRestante: 10,
    estado: "cerrado",
    costo: 1000,
    costoEnvase: 500,
    ...parcial,
  };
}

describe("kgPorSabor", () => {
  it("da un objeto vacío sin baldes", () => {
    expect(kgPorSabor([])).toEqual({});
  });

  it("suma un solo balde", () => {
    expect(kgPorSabor([balde({ saborId: 1, kgRestante: 4 })])).toEqual({ 1: 4 });
  });

  it("suma varios baldes del mismo sabor", () => {
    const baldes = [
      balde({ id: 1, saborId: 1, kgRestante: 4 }),
      balde({ id: 2, saborId: 1, kgRestante: 3 }),
    ];
    expect(kgPorSabor(baldes)).toEqual({ 1: 7 });
  });

  it("separa sabores distintos", () => {
    const baldes = [
      balde({ id: 1, saborId: 1, kgRestante: 4 }),
      balde({ id: 2, saborId: 2, kgRestante: 5 }),
    ];
    expect(kgPorSabor(baldes)).toEqual({ 1: 4, 2: 5 });
  });
});
```

- [ ] **Step 2: Correr el test y confirmar que falla**

Run: `npx vitest run src/lib/baldes.test.ts`
Expected: FAIL — `kgPorSabor is not exported`

- [ ] **Step 3: Agregar la función a `src/lib/baldes.ts`**

Agregar al final del archivo:

```typescript
/** Suma kg_restante de los baldes vivos, agrupado por sabor. */
export function kgPorSabor(baldes: Balde[]): Record<number, number> {
  const totales: Record<number, number> = {};
  for (const balde of baldes) {
    totales[balde.saborId] = (totales[balde.saborId] ?? 0) + balde.kgRestante;
  }
  return totales;
}
```

- [ ] **Step 4: Correr el test y confirmar que pasa**

Run: `npx vitest run src/lib/baldes.test.ts`
Expected: PASS — 4 tests

- [ ] **Step 5: Verificar y commitear**

```bash
npm run verificar
git add src/lib/baldes.ts src/lib/baldes.test.ts
git commit -m "Agregar kgPorSabor con tests"
```

---

### Task 6: `BarraLateral` — rediseño

**Files:**
- Modify: `src/componentes/BarraLateral.tsx`

**Interfaces:**
- Consumes: `modulosDe`, `NOMBRE_COMERCIO`, `salir`, `ETIQUETA_ROL`, `Perfil`
  (todos ya existen, sin cambios).
- Produces: nada que otra tarea consuma — es hoja del árbol de componentes.

- [ ] **Step 1: Reescribir el archivo completo**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NOMBRE_COMERCIO } from "@/config/comercio";
import { modulosDe } from "@/config/navegacion";
import { salir } from "@/modulos/auth/consultas/acciones";
import { ETIQUETA_ROL, type Perfil } from "@/modulos/auth/tipos";

export function BarraLateral({ perfil }: { perfil: Perfil }) {
  const ruta = usePathname();

  return (
    <aside className="flex shrink-0 flex-col gap-4 bg-marco p-4 text-fondo md:min-h-dvh md:w-56">
      <div className="rounded-(--radius-arco) bg-acento px-4 pt-4 pb-3 text-center">
        <div className="font-display text-lg font-bold text-acento-texto">{NOMBRE_COMERCIO}</div>
        <div className="font-mono text-xs tracking-[0.16em] text-acento-texto/80 uppercase">
          Heladería artesanal
        </div>
      </div>

      <nav className="flex flex-1 flex-wrap gap-1 md:flex-col" aria-label="Módulos">
        {modulosDe(perfil.rol).map((modulo) => {
          const activo = ruta === modulo.href;
          return (
            <Link
              key={modulo.href}
              href={modulo.href}
              aria-current={activo ? "page" : undefined}
              className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm transition ${
                activo
                  ? "bg-fondo font-semibold text-marco"
                  : "text-fondo/85 hover:bg-marco-suave hover:text-fondo"
              }`}
            >
              <span aria-hidden="true">{modulo.icono}</span>
              {modulo.etiqueta}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-2 border-t border-marco-suave pt-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destacado font-display font-bold text-marco">
            {perfil.nombre.charAt(0).toUpperCase()}
          </span>
          <div>
            <div className="text-sm font-semibold">{perfil.nombre}</div>
            <div className="font-mono text-xs text-fondo/60">{ETIQUETA_ROL[perfil.rol]}</div>
          </div>
        </div>
        <form action={salir}>
          <button type="submit" className="text-xs underline opacity-70 hover:opacity-100">
            Salir
          </button>
        </form>
      </div>
    </aside>
  );
}
```

`"use client"` es nuevo acá: `usePathname()` es lo que permite marcar el
módulo activo (el mockup lo hace con `aria-current="page"`), y hoy nada lo
calculaba. `perfil` y `modulosDe` son datos/función puros, no dependen del
servidor, así que el componente sigue funcionando igual de bien como
cliente.

- [ ] **Step 2: Verificar y commitear**

```bash
npm run verificar
git add src/componentes/BarraLateral.tsx
git commit -m "Rediseñar BarraLateral con el arco de marca y el módulo activo marcado"
```

Prueba manual rápida acá (no hace falta esperar al Task 15): con
`npm run dev`, entrar y confirmar que el módulo de la URL actual se ve
resaltado en el menú.

---

### Task 7: Sabores — color y reskin de la sección

**Files:**
- Modify: `src/lib/sabores.ts`
- Modify: `src/modulos/inventario/consultas/acciones.ts`
- Modify: `src/modulos/inventario/componentes/FormularioSabor.tsx`
- Create: `src/modulos/inventario/componentes/EditorColorSabor.tsx`
- Modify: `src/modulos/inventario/componentes/SeccionSabores.tsx`

**Interfaces:**
- Consumes: `Tarjeta`, `Punto` (Task 4).
- Produces: `type Sabor` con el campo `color: string` agregado; Server
  Action `editarColorSabor(prev, datos)`. `crearSabor` ahora también manda
  `color`. Nada de esto lo consume otra tarea de este plan (Task 11 usa
  `Sabor.color`, que ya sale de `@/lib/sabores` sin cambiar su nombre de
  exportación).

- [ ] **Step 1: Agregar `color` a `src/lib/sabores.ts`**

Archivo completo:

```typescript
import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";

export type Sabor = {
  id: number;
  nombre: string;
  activo: boolean;
  stockMinimo: number | null;
  color: string;
};

type FilaSabor = {
  id: number;
  nombre: string;
  activo: boolean;
  stock_minimo: string | null;
  color: string;
};

function mapearSabor(fila: FilaSabor): Sabor {
  return {
    id: fila.id,
    nombre: fila.nombre,
    activo: fila.activo,
    stockMinimo: fila.stock_minimo === null ? null : Number(fila.stock_minimo),
    color: fila.color,
  };
}

/** Todos los sabores. RLS ya limita esto a cualquier sesión activa. */
export async function listarSabores(): Promise<Sabor[]> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("sabores")
    .select("id, nombre, activo, stock_minimo, color")
    .order("activo", { ascending: false })
    .order("nombre");

  return ((data as FilaSabor[] | null) ?? []).map(mapearSabor);
}
```

- [ ] **Step 2: Actualizar `crearSabor` y agregar `editarColorSabor` en `acciones.ts`**

Buscar:

```typescript
export async function crearSabor(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const nombre = String(datos.get("nombre") ?? "").trim();
  if (!nombre) return { error: "Escribí un nombre." };

  const supabase = await clienteServidor();
  const { error } = await supabase.from("sabores").insert({ nombre });
```

Reemplazar por:

```typescript
const COLOR_HEX = /^#[0-9a-fA-F]{6}$/;

export async function crearSabor(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const nombre = String(datos.get("nombre") ?? "").trim();
  const color = String(datos.get("color") ?? "").trim();
  if (!nombre) return { error: "Escribí un nombre." };
  if (!COLOR_HEX.test(color)) return { error: "Elegí un color." };

  const supabase = await clienteServidor();
  const { error } = await supabase.from("sabores").insert({ nombre, color });
```

Agregar al final del archivo:

```typescript
export async function editarColorSabor(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const saborId = Number(datos.get("saborId"));
  const color = String(datos.get("color") ?? "").trim();

  if (!Number.isInteger(saborId) || saborId <= 0) return { error: "Sabor inválido." };
  if (!COLOR_HEX.test(color)) return { error: "Color inválido." };

  const supabase = await clienteServidor();
  const { error } = await supabase.from("sabores").update({ color }).eq("id", saborId);

  if (error) return { error: "No se pudo guardar el color." };

  revalidatePath("/inventario");
  revalidatePath("/ventas");
  return SIN_ERROR;
}
```

- [ ] **Step 3: Agregar el color a `FormularioSabor.tsx`**

Buscar:

```tsx
      <Campo id="nombre-sabor" name="nombre" etiqueta="Sabor nuevo" required />
      <Boton type="submit" disabled={enviando}>
```

Reemplazar por:

```tsx
      <Campo id="nombre-sabor" name="nombre" etiqueta="Sabor nuevo" required />
      <label className="flex flex-col gap-1">
        <span className="font-mono text-xs font-semibold tracking-wide text-texto-suave uppercase">
          Color
        </span>
        <input
          type="color"
          name="color"
          defaultValue="#3F6B3A"
          aria-label="Color del sabor"
          className="h-10 w-14 rounded-(--r) border border-linea bg-superficie p-1"
        />
      </label>
      <Boton type="submit" disabled={enviando}>
```

- [ ] **Step 4: Escribir `componentes/EditorColorSabor.tsx`**

```tsx
"use client";

import { useActionState } from "react";
import { editarColorSabor } from "../consultas/acciones";

const INICIAL = { error: null };

export function EditorColorSabor({ saborId, colorActual }: { saborId: number; colorActual: string }) {
  const [estado, accion, enviando] = useActionState(editarColorSabor, INICIAL);

  return (
    <form action={accion} className="flex items-center gap-2">
      <input type="hidden" name="saborId" value={saborId} />
      <input
        type="color"
        name="color"
        defaultValue={colorActual}
        aria-label="Color del sabor"
        disabled={enviando}
        className="h-8 w-10 rounded-(--r) border border-linea bg-superficie p-0.5"
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

- [ ] **Step 5: Reescribir `SeccionSabores.tsx`**

```tsx
import { listarSabores } from "@/lib/sabores";
import { Punto } from "@/componentes/Punto";
import { Tarjeta } from "@/componentes/Tarjeta";
import { BotonActivoSabor } from "./BotonActivoSabor";
import { EditorColorSabor } from "./EditorColorSabor";
import { FormularioMinimo } from "./FormularioMinimo";
import { FormularioSabor } from "./FormularioSabor";

export async function SeccionSabores({ esDuenio }: { esDuenio: boolean }) {
  const sabores = await listarSabores();

  return (
    <Tarjeta>
      <header>
        <h2 className="font-display text-lg font-semibold">Sabores</h2>
        <p className="text-sm text-texto-suave">El mínimo en blanco usa el default del comercio.</p>
      </header>

      <table className="w-full text-left text-sm">
        <thead className="border-b border-linea font-mono text-xs text-texto-suave uppercase">
          <tr>
            <th className="p-2">Color</th>
            <th className="p-2">Sabor</th>
            <th className="p-2">Mínimo (kg)</th>
            <th className="p-2">Estado</th>
          </tr>
        </thead>
        <tbody>
          {sabores.map((sabor) => (
            <tr key={sabor.id} className="border-b border-linea last:border-0">
              <td className="p-2">
                {esDuenio ? (
                  <EditorColorSabor saborId={sabor.id} colorActual={sabor.color} />
                ) : (
                  <Punto color={sabor.color} />
                )}
              </td>
              <td className="p-2">{sabor.nombre}</td>
              <td className="numero p-2">
                {esDuenio ? (
                  <FormularioMinimo saborId={sabor.id} valorActual={sabor.stockMinimo} />
                ) : (
                  (sabor.stockMinimo ?? "default")
                )}
              </td>
              <td className="p-2">
                {esDuenio ? (
                  <BotonActivoSabor saborId={sabor.id} activo={sabor.activo} />
                ) : sabor.activo ? (
                  "Activo"
                ) : (
                  "Inactivo"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {esDuenio && <FormularioSabor />}
    </Tarjeta>
  );
}
```

- [ ] **Step 6: Verificar y commitear**

```bash
npm run verificar
git add src/lib/sabores.ts src/modulos/inventario/consultas/acciones.ts src/modulos/inventario/componentes/FormularioSabor.tsx src/modulos/inventario/componentes/EditorColorSabor.tsx src/modulos/inventario/componentes/SeccionSabores.tsx
git commit -m "Agregar color a Sabores y reskin de la sección"
```

`npm run verificar` no puede probar contra una base real todavía (la
migración de `color` no está aplicada) — la prueba real es el Task 15.

---

### Task 8: Baldes — reskin con `Cubeta` e `Insignia`

**Files:**
- Modify: `src/modulos/inventario/componentes/SeccionBaldes.tsx`

**Interfaces:**
- Consumes: `Tarjeta`, `Cubeta`, `Insignia` (Task 4); `kgPorSabor` (Task 5);
  `Sabor.color` (Task 7).
- Produces: nada que otra tarea consuma.

- [ ] **Step 1: Reescribir el archivo completo**

```tsx
import { obtenerConfigComercio } from "@/lib/configComercio";
import { kgPorSabor, listarBaldes } from "@/lib/baldes";
import { listarSabores } from "@/lib/sabores";
import { Cubeta } from "@/componentes/Cubeta";
import { Insignia } from "@/componentes/Insignia";
import { Tarjeta } from "@/componentes/Tarjeta";
import { saborEnAlerta } from "../alerta";
import { BotonAbrirBalde } from "./BotonAbrirBalde";
import { BotonAjustarBalde } from "./BotonAjustarBalde";
import { FormularioBalde } from "./FormularioBalde";
import { FormularioStockMinimoDefault } from "./FormularioStockMinimoDefault";

const ETIQUETA_ESTADO: Record<string, string> = {
  cerrado: "Cerrado",
  abierto: "Abierto",
};

export async function SeccionBaldes({ esDuenio }: { esDuenio: boolean }) {
  const [sabores, baldes, config] = await Promise.all([
    listarSabores(),
    listarBaldes(),
    obtenerConfigComercio(),
  ]);
  const saboresActivos = sabores.filter((sabor) => sabor.activo);
  const kgPorSaborId = kgPorSabor(baldes);

  return (
    <Tarjeta>
      <header className="flex flex-col gap-2">
        <h2 className="font-display text-lg font-semibold">Baldes</h2>
        <p className="text-sm text-texto-suave">
          Cada balde es una unidad: puede haber varios del mismo sabor a la vez.
        </p>
        {esDuenio && <FormularioStockMinimoDefault valorActual={config.stockMinimoDefault} />}
      </header>

      <div className="flex flex-col gap-4">
        {saboresActivos.map((sabor) => {
          const deEsteSabor = baldes.filter((balde) => balde.saborId === sabor.id);
          const abierto = deEsteSabor.find((balde) => balde.estado === "abierto") ?? null;
          const kgRestanteTotal = kgPorSaborId[sabor.id] ?? 0;
          const kgInicialTotal = deEsteSabor.reduce((suma, balde) => suma + balde.kgInicial, 0);
          const pct = kgInicialTotal > 0 ? (kgRestanteTotal / kgInicialTotal) * 100 : 0;

          let insignia: { variante: "ok" | "advertencia" | "alerta"; texto: string };
          if (!abierto) {
            insignia = { variante: "alerta", texto: "Sin balde abierto" };
          } else if (saborEnAlerta(sabor, abierto, config.stockMinimoDefault)) {
            insignia = { variante: "advertencia", texto: "Se está por acabar" };
          } else {
            insignia = { variante: "ok", texto: "Ok" };
          }

          return (
            <div key={sabor.id} className="flex items-start gap-3 rounded-(--r) border border-linea p-3">
              <Cubeta pct={pct} color={sabor.color} bajo={insignia.variante !== "ok"} />

              <div className="flex flex-1 flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{sabor.nombre}</span>
                  <Insignia variante={insignia.variante}>{insignia.texto}</Insignia>
                </div>

                {deEsteSabor.length === 0 ? (
                  <p className="text-sm text-texto-suave">Sin baldes en stock.</p>
                ) : (
                  <ul className="flex flex-col gap-1 text-sm">
                    {deEsteSabor.map((balde) => (
                      <li key={balde.id} className="flex items-center gap-3">
                        <span className="numero">{balde.codigo}</span>
                        <Insignia variante={balde.estado === "abierto" ? "ok" : "neutra"}>
                          {ETIQUETA_ESTADO[balde.estado]}
                        </Insignia>
                        <span className="numero">{balde.kgRestante} kg</span>
                        {balde.estado === "cerrado" && <BotonAbrirBalde baldeId={balde.id} />}
                        {balde.estado === "abierto" && <BotonAjustarBalde baldeId={balde.id} />}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <FormularioBalde sabores={saboresActivos} />
    </Tarjeta>
  );
}
```

- [ ] **Step 2: Verificar y commitear**

```bash
npm run verificar
git add src/modulos/inventario/componentes/SeccionBaldes.tsx
git commit -m "Reskin de Baldes con Cubeta e Insignia"
```

---

### Task 9: Insumos — reskin con `Insignia`

**Files:**
- Modify: `src/modulos/inventario/componentes/SeccionInsumos.tsx`

**Interfaces:**
- Consumes: `Tarjeta`, `Insignia` (Task 4).
- Produces: nada que otra tarea consuma.

- [ ] **Step 1: Reescribir el archivo completo**

```tsx
import { Insignia } from "@/componentes/Insignia";
import { Tarjeta } from "@/componentes/Tarjeta";
import { listarInsumos } from "../consultas/insumos";
import { FormularioInsumo } from "./FormularioInsumo";
import { FormularioMovimiento } from "./FormularioMovimiento";

const ETIQUETA_UNIDAD: Record<string, string> = { u: "u", kg: "kg" };

export async function SeccionInsumos({ esDuenio }: { esDuenio: boolean }) {
  const insumos = await listarInsumos();

  return (
    <Tarjeta>
      <header>
        <h2 className="font-display text-lg font-semibold">Insumos</h2>
        <p className="text-sm text-texto-suave">Cucuruchos, potes vacíos, salsas.</p>
      </header>

      <table className="w-full text-left text-sm">
        <thead className="border-b border-linea font-mono text-xs text-texto-suave uppercase">
          <tr>
            <th className="p-2">Insumo</th>
            <th className="p-2">Código</th>
            <th className="p-2">Stock</th>
            <th className="p-2">Estado</th>
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
                <Insignia variante={insumo.cantidad <= insumo.minimo ? "advertencia" : "ok"}>
                  {insumo.cantidad <= insumo.minimo ? "Reponer" : "Ok"}
                </Insignia>
              </td>
              <td className="p-2">
                <FormularioMovimiento insumoId={insumo.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {esDuenio && <FormularioInsumo />}
    </Tarjeta>
  );
}
```

- [ ] **Step 2: Verificar y commitear**

```bash
npm run verificar
git add src/modulos/inventario/componentes/SeccionInsumos.tsx
git commit -m "Reskin de Insumos con Insignia"
```

---

### Task 10: Formatos — reskin con `Insignia` y `Boton peligro`

**Files:**
- Modify: `src/modulos/inventario/componentes/FilaFormato.tsx`
- Modify: `src/modulos/inventario/componentes/SeccionFormatos.tsx`

**Interfaces:**
- Consumes: `Tarjeta`, `Insignia`, `Boton` (Task 3 y 4).
- Produces: nada que otra tarea consuma.

- [ ] **Step 1: Reescribir `FilaFormato.tsx`** (mismos campos y acciones que
      hoy, cambia el botón de borrar y el estado inactivo)

```tsx
"use client";

import { useActionState } from "react";
import { Boton } from "@/componentes/Boton";
import { Insignia } from "@/componentes/Insignia";
import type { Formato } from "@/lib/formatos";
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
        {!formato.activo && <Insignia variante="neutra">Inactivo</Insignia>}
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
        <Boton type="submit" variante="peligro" disabled={borrando}>
          {borrando ? "Borrando…" : "Borrar"}
        </Boton>
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

- [ ] **Step 2: Envolver `SeccionFormatos.tsx` en `Tarjeta`**

```tsx
import { listarFormatos } from "@/lib/formatos";
import { Tarjeta } from "@/componentes/Tarjeta";
import { FilaFormato } from "./FilaFormato";
import { FormularioFormato } from "./FormularioFormato";

export async function SeccionFormatos({ esDuenio }: { esDuenio: boolean }) {
  const formatos = await listarFormatos();

  return (
    <Tarjeta>
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
    </Tarjeta>
  );
}
```

- [ ] **Step 3: Verificar y commitear**

```bash
npm run verificar
git add src/modulos/inventario/componentes/FilaFormato.tsx src/modulos/inventario/componentes/SeccionFormatos.tsx
git commit -m "Reskin de Formatos con Insignia y Boton peligro"
```

---

### Task 11: Ventas — `SelectorFormatoYSabores` como botones

**Files:**
- Modify: `src/modulos/ventas/componentes/SelectorFormatoYSabores.tsx`

**Interfaces:**
- Consumes: `Punto` (Task 4); `kgPorSabor` (Task 5); `Sabor.color` (Task 7);
  `type Balde` de `@/lib/baldes`.
- Produces: el mismo `<SelectorFormatoYSabores formatos sabores onAgregar>`
  de antes, más una prop nueva `baldes: Balde[]` — el Task 12 tiene que
  pasarla.

- [ ] **Step 1: Reescribir el archivo completo**

```tsx
"use client";

import { useState } from "react";
import { Boton } from "@/componentes/Boton";
import { Punto } from "@/componentes/Punto";
import { kgPorSabor, type Balde } from "@/lib/baldes";
import type { Formato } from "@/lib/formatos";
import type { Sabor } from "@/lib/sabores";
import type { ItemEnCarrito } from "../tipos";

export function SelectorFormatoYSabores({
  formatos,
  sabores,
  baldes,
  onAgregar,
}: {
  formatos: Formato[];
  sabores: Sabor[];
  baldes: Balde[];
  onAgregar: (item: ItemEnCarrito) => void;
}) {
  const [formatoId, setFormatoId] = useState<number | null>(null);
  const [saborIds, setSaborIds] = useState<number[]>([]);

  const formato = formatos.find((f) => f.id === formatoId) ?? null;
  const kgDisponible = kgPorSabor(baldes);

  function completar(idsFinal: number[]) {
    if (!formato || idsFinal.length === 0) return;
    const saboresNombres = idsFinal.map(
      (id) => sabores.find((sabor) => sabor.id === id)?.nombre ?? "",
    );
    onAgregar({
      formatoId: formato.id,
      saborIds: idsFinal,
      formatoNombre: formato.nombre,
      precio: formato.precio,
      saboresNombres,
    });
    setFormatoId(null);
    setSaborIds([]);
  }

  function alternarSabor(saborId: number) {
    setSaborIds((actuales) => {
      const yaElegido = actuales.includes(saborId);
      const nuevos = yaElegido ? actuales.filter((id) => id !== saborId) : [...actuales, saborId];
      if (!yaElegido && formato && nuevos.length === formato.cantidadSabores) {
        completar(nuevos);
        return [];
      }
      return nuevos;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-2 font-mono text-xs tracking-wide text-texto-suave uppercase">1 · Formato</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {formatos.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={formatoId === f.id}
              onClick={() => {
                setFormatoId(f.id);
                setSaborIds([]);
              }}
              className={`flex flex-col items-center gap-1 rounded-(--radius-arco) border p-3 text-center transition ${
                formatoId === f.id
                  ? "border-marco bg-marco text-fondo"
                  : "border-linea bg-superficie hover:bg-superficie-honda"
              }`}
            >
              <span className="font-display font-semibold">{f.nombre}</span>
              <span className="font-mono text-xs opacity-70">
                {f.gramos} g · {f.cantidadSabores} sabor{f.cantidadSabores > 1 ? "es" : ""}
              </span>
              <span className="numero">${f.precio}</span>
            </button>
          ))}
        </div>
      </div>

      {formato && (
        <div>
          <p className="mb-2 font-mono text-xs tracking-wide text-texto-suave uppercase">
            2 · Sabores — elegí hasta {formato.cantidadSabores}, llevás {saborIds.length}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {sabores
              .filter((sabor) => sabor.activo)
              .map((sabor) => {
                const elegido = saborIds.includes(sabor.id);
                const agotado = (kgDisponible[sabor.id] ?? 0) <= 0;
                return (
                  <button
                    key={sabor.id}
                    type="button"
                    aria-pressed={elegido}
                    disabled={agotado}
                    onClick={() => alternarSabor(sabor.id)}
                    className={`flex items-center gap-2 rounded-(--radius-arco) border p-2 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      elegido
                        ? "border-acento bg-acento-fondo"
                        : "border-linea bg-superficie hover:bg-superficie-honda"
                    }`}
                  >
                    <Punto color={sabor.color} grande />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{sabor.nombre}</span>
                      <span className="font-mono text-xs text-texto-suave">
                        {agotado ? "agotado" : `${(kgDisponible[sabor.id] ?? 0).toFixed(1)} kg`}
                      </span>
                    </span>
                  </button>
                );
              })}
          </div>

          {saborIds.length > 0 && saborIds.length < formato.cantidadSabores && (
            <Boton type="button" className="mt-2" onClick={() => completar(saborIds)}>
              Agregar con estos sabores
            </Boton>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar y commitear**

```bash
npm run verificar
git add src/modulos/ventas/componentes/SelectorFormatoYSabores.tsx
git commit -m "Rehacer el selector de formato y sabores como botones, con auto-agregado"
```

`npm run verificar` va a fallar acá si el Task 12 no se hizo todavía,
porque `FormularioTicket` (que renderiza este componente) no le pasaría la
prop `baldes` nueva. Si eso pasa, es esperado — el Task 12 lo resuelve a
continuación. Si preferís no ver ese error transitorio, hacé los Tasks 11
y 12 en una sola tanda antes de correr `npm run verificar`.

---

### Task 12: Ventas — `FormularioTicket` y la página

**Files:**
- Modify: `src/modulos/ventas/componentes/FormularioTicket.tsx`
- Modify: `src/app/(app)/ventas/page.tsx`

**Interfaces:**
- Consumes: `ArcoCab`, `Boton`, `Punto` (Task 4); `listarBaldes` de
  `@/lib/baldes` (ya existe); `SelectorFormatoYSabores` con su prop
  `baldes` nueva (Task 11).
- Produces: nada que otra tarea consuma.

- [ ] **Step 1: Reescribir `FormularioTicket.tsx`**

```tsx
"use client";

import { useActionState, useState } from "react";
import { ArcoCab } from "@/componentes/ArcoCab";
import { Boton } from "@/componentes/Boton";
import { Punto } from "@/componentes/Punto";
import type { Balde } from "@/lib/baldes";
import type { Formato } from "@/lib/formatos";
import type { Sabor } from "@/lib/sabores";
import type { ItemDeTicket, ItemEnCarrito, MedioPago } from "../tipos";
import { registrarVenta } from "../consultas/acciones";
import { BotonAbrirBaldeFaltante } from "./BotonAbrirBaldeFaltante";
import { SelectorFormatoYSabores } from "./SelectorFormatoYSabores";

const INICIAL = { error: null, faltaBalde: null };

export function FormularioTicket({
  formatos,
  sabores,
  baldes,
}: {
  formatos: Formato[];
  sabores: Sabor[];
  baldes: Balde[];
}) {
  const [carrito, setCarrito] = useState<ItemEnCarrito[]>([]);
  const [medioPago, setMedioPago] = useState<MedioPago>("efectivo");
  const [estado, accion, enviando] = useActionState(registrarVenta, INICIAL);

  const total = carrito.reduce((suma, item) => suma + item.precio, 0);
  const itemsParaEnviar: ItemDeTicket[] = carrito.map((item) => ({
    formatoId: item.formatoId,
    saborIds: item.saborIds,
  }));

  function quitar(indice: number) {
    setCarrito((actuales) => actuales.filter((_, i) => i !== indice));
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <SelectorFormatoYSabores
        formatos={formatos.filter((formato) => formato.activo)}
        sabores={sabores}
        baldes={baldes}
        onAgregar={(item) => setCarrito((actuales) => [...actuales, item])}
      />

      <div className="flex flex-col lg:sticky lg:top-4 lg:self-start">
        <ArcoCab
          eyebrow="Pedido"
          titulo={`${carrito.length} ítem${carrito.length === 1 ? "" : "s"}`}
        />
        <div className="flex flex-col gap-3 rounded-b-(--r-grande) border border-t-0 border-linea bg-superficie p-4 shadow-(--shadow-tarjeta)">
          {carrito.length === 0 ? (
            <p className="text-sm text-texto-suave">Elegí un formato y después los sabores.</p>
          ) : (
            <ul className="flex max-h-[44vh] flex-col gap-2 overflow-y-auto">
              {carrito.map((item, indice) => (
                <li key={indice} className="flex items-start gap-2 border-b border-linea pb-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">
                      {item.formatoNombre} · <span className="numero">${item.precio}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-texto-suave">
                      {item.saborIds.map((saborId) => {
                        const sabor = sabores.find((s) => s.id === saborId);
                        return (
                          <span key={saborId} className="flex items-center gap-1">
                            <Punto color={sabor?.color ?? "var(--texto-suave)"} /> {sabor?.nombre ?? ""}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => quitar(indice)}
                    aria-label={`Quitar ${item.formatoNombre}`}
                    className="text-texto-suave hover:text-alerta"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t-2 border-marco pt-3">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-xs tracking-wide text-texto-suave uppercase">Total</span>
              <span className="numero text-4xl font-medium">
                <span className="text-base opacity-55">$</span>
                {total}
              </span>
            </div>

            <form action={accion} className="mt-3 flex flex-col gap-2">
              <input type="hidden" name="items" value={JSON.stringify(itemsParaEnviar)} />
              <select
                name="medioPago"
                value={medioPago}
                onChange={(evento) => setMedioPago(evento.target.value as MedioPago)}
                className="rounded-(--r) border border-linea bg-superficie px-3 py-2 text-sm"
              >
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="transferencia">Transferencia</option>
              </select>
              <Boton type="submit" tamano="grande" disabled={enviando || carrito.length === 0}>
                {enviando ? "Cobrando…" : "Cobrar"}
              </Boton>
            </form>

            {estado.error && (
              <div role="alert" className="mt-2 flex flex-col gap-2 text-sm text-alerta">
                <p>{estado.error}</p>
                {estado.faltaBalde?.baldeParaAbrir && (
                  <BotonAbrirBaldeFaltante
                    baldeId={estado.faltaBalde.baldeParaAbrir}
                    saborNombre={estado.faltaBalde.saborNombre}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Pasar `baldes` desde la página**

Archivo completo de `src/app/(app)/ventas/page.tsx`:

```tsx
import { listarBaldes } from "@/lib/baldes";
import { listarFormatos } from "@/lib/formatos";
import { listarSabores } from "@/lib/sabores";
import { FormularioTicket } from "@/modulos/ventas/componentes/FormularioTicket";
import { SeccionUltimasVentas } from "@/modulos/ventas/componentes/SeccionUltimasVentas";

export const metadata = { title: "Ventas" };

export default async function Ventas() {
  const [formatos, sabores, baldes] = await Promise.all([
    listarFormatos(),
    listarSabores(),
    listarBaldes(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold">Ventas</h1>
        <p className="text-texto-suave">Armá el ticket y cobrá.</p>
      </header>

      <FormularioTicket formatos={formatos} sabores={sabores} baldes={baldes} />

      <SeccionUltimasVentas />
    </div>
  );
}
```

El pedido ya no queda envuelto en una `Tarjeta` con encabezado "Nueva
venta": el mockup no envuelve su `.pos` en una tarjeta grande, son los
botones y el carrito los que tienen forma propia. Se saca esa envoltura
para no duplicar el efecto tarjeta dos veces.

- [ ] **Step 3: Verificar y commitear**

```bash
npm run verificar
git add src/modulos/ventas/componentes/FormularioTicket.tsx "src/app/(app)/ventas/page.tsx"
git commit -m "Rediseñar el ticket de Ventas: layout de 2 columnas y total gigante"
```

---

### Task 13: Ventas — últimas ventas con estilo ticket

**Files:**
- Modify: `src/modulos/ventas/componentes/FilaVentaReciente.tsx`
- Modify: `src/modulos/ventas/componentes/SeccionUltimasVentas.tsx`

**Interfaces:**
- Consumes: `Insignia`, `Tarjeta` (Task 4).
- Produces: nada que otra tarea consuma.

- [ ] **Step 1: Reescribir `FilaVentaReciente.tsx`**

```tsx
"use client";

import { useActionState } from "react";
import { Insignia } from "@/componentes/Insignia";
import type { Sabor } from "@/lib/sabores";
import type { VentaReciente } from "../tipos";
import { anularVenta } from "../consultas/acciones";
import { CorregirSaborItem } from "./CorregirSaborItem";

const INICIAL = { error: null };

const ETIQUETA_MEDIO: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
};

export function FilaVentaReciente({ venta, sabores }: { venta: VentaReciente; sabores: Sabor[] }) {
  const [estado, accion, enviando] = useActionState(anularVenta, INICIAL);

  return (
    <div className="rounded-(--r) border border-linea bg-superficie p-3 font-mono text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>
          #{venta.id} · {ETIQUETA_MEDIO[venta.medioPago]}
        </span>
        <span className="numero font-semibold">${venta.total}</span>
      </div>

      <div className="my-2 border-t border-dashed border-linea" />

      <ul className="flex flex-col gap-2">
        {venta.items.map((item) => (
          <li key={item.id} className="flex flex-col gap-1">
            <div className="flex justify-between gap-2">
              <span>{item.formatoNombre}</span>
              <span className="numero">${item.precio}</span>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {item.sabores.map((sabor) => (
                <CorregirSaborItem
                  key={sabor.saborId}
                  ventaItemId={item.id}
                  saborActual={sabor}
                  sabores={sabores}
                  disabled={venta.estado !== "cobrada"}
                />
              ))}
            </div>
          </li>
        ))}
      </ul>

      <div className="my-2 border-t border-dashed border-linea" />

      <div className="flex items-center justify-between gap-2">
        {venta.estado === "anulada" ? (
          <Insignia variante="alerta">Anulada</Insignia>
        ) : (
          <form action={accion}>
            <input type="hidden" name="ventaId" value={venta.id} />
            <button type="submit" disabled={enviando} className="text-xs underline opacity-70">
              {enviando ? "Anulando…" : "Anular"}
            </button>
          </form>
        )}
        {estado.error && (
          <span role="alert" className="text-xs text-alerta">
            {estado.error}
          </span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Envolver `SeccionUltimasVentas.tsx` en `Tarjeta`**

```tsx
import { listarSabores } from "@/lib/sabores";
import { Tarjeta } from "@/componentes/Tarjeta";
import { listarVentasRecientes } from "../consultas/ventas";
import { FilaVentaReciente } from "./FilaVentaReciente";

export async function SeccionUltimasVentas() {
  const [ventas, sabores] = await Promise.all([listarVentasRecientes(), listarSabores()]);

  return (
    <Tarjeta>
      <header>
        <h2 className="font-display text-lg font-semibold">Últimas ventas</h2>
        <p className="text-sm text-texto-suave">
          Anular, o corregir un sabor si el cliente cambió de idea.
        </p>
      </header>

      {ventas.length === 0 ? (
        <p className="text-sm text-texto-suave">Todavía no se registró ninguna venta.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {ventas.map((venta) => (
            <FilaVentaReciente key={venta.id} venta={venta} sabores={sabores} />
          ))}
        </div>
      )}
    </Tarjeta>
  );
}
```

- [ ] **Step 3: Verificar y commitear**

```bash
npm run verificar
git add src/modulos/ventas/componentes/FilaVentaReciente.tsx src/modulos/ventas/componentes/SeccionUltimasVentas.tsx
git commit -m "Reskin de últimas ventas con estilo ticket"
```

---

### Task 14: `rls.test.ts` — caso de `color` mal formado

**Files:**
- Modify: `src/modulos/inventario/rls.test.ts`

**Interfaces:**
- Consumes: columna `sabores.color` (Task 1).
- Produces: nada que otra tarea consuma; es la red de seguridad del `check`.

- [ ] **Step 1: Agregar el caso**

Agregar, dentro del mismo `describe("RLS: inventario", ...)`, justo antes
del cierre `});` final:

```typescript
  it("no se puede insertar un sabor con color mal formado", async () => {
    const { error } = await servicio
      .from("sabores")
      .insert({ nombre: `Sabor con color trucho ${Date.now()}`, color: "no-es-un-color" });
    expect(error).not.toBeNull();
  });
```

- [ ] **Step 2: Verificar y commitear**

```bash
npm run verificar
git add src/modulos/inventario/rls.test.ts
git commit -m "Agregar caso de color mal formado en sabores"
```

---

### Task 15: Verificación manual, siembra de datos y cierre

**Files:** ninguno (solo verificación manual + un script de siembra +
ajuste de checklist)

**Interfaces:** ninguna — cierra el rediseño.

- [ ] **Step 1: Pedirle al usuario que aplique la migración**

Mensaje para el usuario: "Abrí el SQL Editor de tu proyecto en supabase.com,
pegá el contenido completo de
`supabase/migrations/20260921150000_color_sabor.sql`, y ejecutalo."

- [ ] **Step 2: Recorrer las cinco pantallas y confirmar que nada se rompió**

Con `npm run dev` corriendo y sesión como `goro` (dueño):

1. **Sabores**: crear uno nuevo eligiendo un color; cambiarle el color a
   uno existente; ponerle un mínimo; activar/desactivar — las cuatro cosas
   tienen que seguir funcionando igual que antes del rediseño.
2. **Baldes**: confirmar que la cubeta de cada sabor se ve con su color
   real y el nivel baja/sube según los baldes; abrir un balde cerrado;
   ajustar uno abierto con un valor positivo y otro negativo.
3. **Insumos**: registrar un movimiento; confirmar que la Insignia cambia
   a "Reponer" cuando la cantidad baja del mínimo.
4. **Formatos**: crear uno, editarle el precio, borrarlo con el botón rojo
   nuevo (confirmando el diálogo del navegador).
5. **Ventas**: armar un ticket tocando formato y sabores como botones,
   confirmar que se agrega solo al completar el cupo, probar el botón
   manual eligiendo menos sabores que el cupo, cobrar, corregir un sabor de
   la venta recién hecha, y anularla — confirmar que los baldes involucrados
   vuelven a su valor original en cada caso.
6. Repetir los pasos 4 y 5 como un usuario `colaborador`: tiene que poder
   cobrar y anular, pero no ver los formularios de alta/edición de
   Sabores/Insumos/Formatos.

- [ ] **Step 3: Actualizar el checklist**

En `supabase/README.md`, cambiar:

```markdown
| `20260921150000_color_sabor.sql`| ⬜       |
```

por:

```markdown
| `20260921150000_color_sabor.sql`| ✅       |
```

- [ ] **Step 4: Commitear la actualización del checklist**

```bash
git add supabase/README.md
git commit -m "Marcar la migración de color de sabor como aplicada"
```

- [ ] **Step 5: Preguntarle al usuario qué dataset quiere, y escribir el script de siembra**

Preguntarle explícitamente: "¿Sembramos con el dataset de ejemplo del
mockup, o preferís que cargue los sabores/insumos/formatos reales de
Goro?" Si elige lo real, se reemplazan los valores de abajo por los suyos,
misma estructura. Si elige el dataset de ejemplo, se usa tal cual:

```sql
-- ============================================================================
-- Siembra de ejemplo — NO es una migración versionada, es un script aparte
-- que se corre una sola vez a mano si se quiere partir con datos de
-- ejemplo en vez de un sistema vacío. Dataset tomado del mockup
-- (index.html), con los mismos colores reales por sabor.
-- ============================================================================

insert into public.sabores (nombre, color) values
  ('Dulce de leche',          '#C08A45'),
  ('Chocolate amargo',        '#4A2C1A'),
  ('Chocolate suizo',         '#7A4B2B'),
  ('Sambayón',                '#E8C86A'),
  ('Vainilla',                '#F2E6C8'),
  ('Pistacho',                '#8FAE5B'),
  ('Frutilla a la crema',     '#E1798A'),
  ('Limón',                   '#EFE28A'),
  ('Frambuesa',               '#B33A5B'),
  ('Maracuyá',                '#E7B02F');

-- Los códigos se escriben a mano (no vía siguiente_numero_insumo, que no
-- corre en un script de siembra) — por eso el setval de más abajo, para
-- que el próximo insumo dado de alta desde la UI no repita un código.
insert into public.insumos (nombre, codigo, unidad, minimo, costo) values
  ('Cucuruchos',         'GA0000001', 'u',  200,  190),
  ('Vasitos 160g',       'GA0000002', 'u',  150,  150),
  ('Potes 1/4 kg',       'GA0000003', 'u',  100,  320),
  ('Potes 1/2 kg',       'GA0000004', 'u',  100,  420),
  ('Potes 1 kg',         'GA0000005', 'u',  80,   560),
  ('Cucharitas',         'GA0000006', 'u',  800,  22),
  ('Salsa de chocolate', 'GA0000007', 'kg', 2,    6800),
  ('Servilletas',        'GA0000008', 'u',  1000, 8);

select setval('public.insumos_secuencia', 8, true);

insert into public.formatos (nombre, gramos, cantidad_sabores, precio) values
  ('Cucurucho', 120,  1, 2200),
  ('Doble',     180,  2, 2900),
  ('Vasito',    160,  2, 2700),
  ('1/4 kilo',  250,  2, 6500),
  ('1/2 kilo',  500,  3, 11800),
  ('1 kilo',    1000, 4, 21000);
```

Guardar como `supabase/seed_ejemplo.sql` y pedirle al usuario que lo corra
a mano en el SQL Editor, mismo criterio que las migraciones — este archivo
no se versiona como migración porque es puramente data de arranque, no un
cambio de esquema.
