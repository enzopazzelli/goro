# Rediseño visual: portar el vocabulario del mockup al sistema real

Estado: aprobado en brainstorming, pendiente de plan de implementación.
Fecha: 2026-09-21.

## Contexto

El módulo de Ventas quedó funcionalmente completo, pero con una UI genérica
de Tailwind (`<select>`, checkboxes, listas de texto) que no se parece al
mockup de venta (`index.html`) — el que se usó para vender el proyecto. El
propio mockup lo anticipa en su comentario de cabecera: "DECISIONES DE
DISEÑO (para no perderlas cuando esto pase a Next.js)".

Explorando el código: **la paleta de colores y las tres tipografías ya se
portaron fielmente desde Fase 1** (`tema.css` coincide token por token con
el mockup; `src/lib/fuentes.ts` usa las mismas tres fuentes vía
`next/font/google`). Lo que nunca se tradujo es el **vocabulario de
componentes** (el "arco", tarjetas, insignias, píldoras, y la cubeta con
nivel de kilos por sabor) y, puntualmente en Ventas, el **flujo de
interacción**: formato y sabores son botones, no controles de formulario, y
el pedido se completa solo al llenar el cupo de sabores del formato.

El usuario eligió portar el vocabulario a **todo el sistema de una vez**:
`BarraLateral` y los cinco módulos ya construidos y verificados (Sabores,
Baldes, Insumos, Formatos dentro de Inventario, y Ventas completo).

`index.html` sigue congelado — no se toca, es solo referencia de diseño
(AGENTS.md).

## Decisiones de alcance (brainstorming)

1. **`sabores.color` se agrega** (migración + selector). Sin esto la cubeta
   no puede ser fiel al mockup — "el color real de cada sabor es un dato
   del sistema", dice el propio mockup, y hoy esa columna no existe.
2. **La cubeta de Baldes es un agregado por sabor** (suma de `kg_restante`
   de sus baldes vivos), no una cubeta por balde individual — el mockup
   modela un sabor = un número; el sistema real modela varios baldes por
   sabor a propósito (Fase 2), así que la cubeta resume y la lista de
   baldes debajo mantiene el detalle operable.
3. **La arquitectura de información de Inventario no cambia**: sigue siendo
   secciones apiladas sin tabs (decisión de Fase 2, por la regla de "una
   vista visible por vez" del prompt base). Lo que cambia es el vocabulario
   visual de cada sección, no la navegación entre ellas — el mockup usa
   tabs para su Stock, pero esa es una decisión de UI que Fase 2 ya
   reemplazó deliberadamente.
4. **`BarraLateral` no porta dos piezas del mockup en esta vuelta**: el
   contador de alertas junto a un módulo (`nav__globo` — no hay ninguna
   fuente de ese número cableada hoy) y la barra fija inferior en mobile
   (hoy se resuelve envolviendo los items arriba; cambiarlo es una pieza de
   layout aparte, no un restyle). Quedan anotadas como mejoras futuras.
5. **La "Insignia" de insumo bajo mínimo usa `advertencia` (naranja), no
   `alerta` (rojo)**: se reserva `alerta` para lo que bloquea una venta
   ahora mismo (ej. un sabor sin ningún balde abierto); un insumo bajo
   mínimo es "reponer pronto", no un bloqueo inmediato.
6. **En Ventas, el cupo completo agrega solo al carrito** (el gesto fluido
   del mockup); **elegir menos sabores que el cupo requiere un botón manual**
   "Agregar con estos sabores" — el mockup no cubre este caso (su demo
   siempre llena el cupo), pero ya se decidió como requisito real durante
   el diseño de Ventas ("1 kg todo frutilla").
7. **Medio de pago y "Cobrar" quedan inline**, donde ya están — el mockup no
   tiene una pantalla de cobro separada en su vista de venta que valga la
   pena copiar.
8. **"Últimas ventas" toma prestado el estilo visual `.ticket`** (monoespaciado,
   separador punteado) del módulo Historial del mockup — que es una vista
   aparte allá —, pero se queda ubicada dentro de `/ventas`, como ya se
   había decidido en el spec de Ventas.
9. **Sin cambios a `consultas/`, Server Actions de negocio, RLS de negocio
   ni migraciones existentes** — es un cambio de capa de presentación, con
   una sola excepción de datos: la columna `color`.
10. **Al final, un script de siembra** (no una migración de esquema) para
    cargar sabores con color, insumos y formatos de ejemplo, así el sistema
    no queda vacío después del rediseño. El usuario decide en ese momento
    si usa el dataset del mockup o los productos reales de Goro.

## Migración: `sabores.color`

```sql
alter table public.sabores
  add column color text not null default '#3F6B3A',
  add constraint color_formato_hex check (color ~ '^#[0-9a-fA-F]{6}$');
```

Default al acento del sistema (no un color al azar): los sabores existentes
no quedan con un valor sin sentido, y Goro los personaliza después desde la
UI. `crearSabor` (alta) y una nueva acción `editarColorSabor` lo escriben;
`listarSabores`/el tipo `Sabor` lo agregan a su forma.

## Tokens nuevos en `tema.css` y `globals.css`

```css
/* tema.css */
--radio-chico: 10px;
--arco: 999px 999px var(--radio-chico) var(--radio-chico);
--sombra: 0 1px 0 rgba(42, 27, 18, 0.04), 0 8px 24px -18px rgba(42, 27, 18, 0.5);
--advertencia: #c97b34;
--advertencia-fondo: #f8ecd9;
```

En `globals.css`, dentro de `@theme inline`: `--radius-arco: var(--arco)`,
`--shadow-tarjeta: var(--sombra)`, `--color-advertencia: var(--advertencia)`,
`--color-advertencia-fondo: var(--advertencia-fondo)` — para que salgan como
utilidades de Tailwind (`rounded-(--radius-arco)`, `shadow-(--shadow-tarjeta)`,
`bg-advertencia`, `text-advertencia`, `bg-advertencia-fondo`).

## Vocabulario de componentes compartidos (`src/componentes/`)

| Componente | Qué es | Notas |
| --- | --- | --- |
| `Boton` (reescrito) | Botón con forma de píldora (`rounded-full`, no `--r`) | Variantes: `principal`, `suave` (ya existen), `fantasma` y `peligro` (nuevas). Prop `tamano?: "normal" \| "grande"`. |
| `Campo` (ajuste) | Igual que hoy, etiqueta pasa a `font-mono` | El radio ya coincidía con el mockup (10px), no cambia forma. |
| `Tarjeta` | Envoltorio `bg-superficie border border-linea rounded-(--r-grande) shadow-(--shadow-tarjeta)` | Reemplaza el `<section>` repetido a mano en cada `Seccion*.tsx`. |
| `ArcoCab` | Cabecera oscura con forma de arco | Prop `variante?: "marco" \| "acento"` (marco = default, para "unidades de trabajo"; acento, para la marca). Se usa en la marca de `BarraLateral` y en la cabecera del carrito de Ventas — no en cabeceras de sección de Inventario (esas van con `<h2>` simple, como el mockup). |
| `Insignia` | Píldora chica de estado | Variantes `ok \| advertencia \| alerta \| neutra`. |
| `Pildora` | Botón toggle chico (`aria-pressed`) | Sin uso hoy salvo el buscador/filtro de Ventas si se necesita a futuro. |
| `Punto` | Círculo de color, dos tamaños | El color real de un sabor, inline junto a su nombre en cualquier lista. |
| `Cubeta` | Pozzetti con nivel relleno | Props `pct: number`, `color: string`, `bajo?: boolean` (agrega el aro de alerta). |

## `src/lib/baldes.ts`: `kgPorSabor`

Función pura nueva, agregada al archivo que ya tiene `listarBaldes`:
`kgPorSabor(baldes: Balde[]): Record<number, number>` — suma `kgRestante`
de los baldes vivos, agrupado por `saborId`. La usan `SeccionBaldes`
(Inventario, refactorizada — hoy calcula lo mismo a mano en un `.filter`
por sabor) y `SelectorFormatoYSabores` (Ventas, para deshabilitar sabores
agotados de entrada — es una cita textual del mockup: "los sabores
agotados aparecen deshabilitados... es el único momento en que el stock
evita un error, y tiene que ser evidente").

## `BarraLateral`

```
ArcoCab variante="acento"   → bloque marca (nombre + "Heladería artesanal")
nav                          → mismo listado plano de hoy (modulosDe), cada
                               item como píldora: hover bg-marco-suave,
                               activo bg-fondo/text-marco
pie                          → avatar circular (inicial, bg-destacado) +
                               nombre + rol (dato, muted) + "Salir" fantasma
```

Sin agrupar en "Mostrador"/"Administración" (son 5 links, agrupar no aporta
todavía). Sin badge de alertas ni barra fija en mobile (Decisión 4).

## Inventario

Mismas cuatro secciones, misma arquitectura (Decisión 3), reskin por dentro:

- **Sabores** (`Tarjeta`): tabla con columnas Color (`Punto`, editable con
  `<input type="color">` nativo vía la nueva `editarColorSabor`), Sabor,
  Mínimo (`FormularioMinimo`, sin cambio de lógica), Estado
  (`BotonActivoSabor`, sin cambio de lógica). `FormularioSabor` (alta) suma
  el mismo input de color.
- **Baldes**: acá vive la `Cubeta` (los kilos son de `baldes`, no de
  `sabores`). Por sabor activo, la `Insignia` de la cubeta sale de combinar
  lo que `SeccionBaldes` ya distingue hoy (sin nombrarlo como tres niveles):
  `alerta` (rojo) si no hay ningún balde abierto — bloquea vender ese sabor
  ahora mismo —, `advertencia` (naranja) si hay balde abierto pero
  `saborEnAlerta()` da `true` (bajo el mínimo), `ok` si no. Debajo, la lista
  de baldes individuales (código, `Insignia` de estado en vez del texto
  plano de hoy, botones Abrir/Ajustar sin cambio de lógica).
- **Insumos**: tabla con `Insignia` `advertencia` (Decisión 5) cuando
  `cantidad <= minimo`, `ok` si no.
- **Formatos**: sin equivalente en el mockup (no tiene pantalla de admin
  para esto) — se extrapola el vocabulario: `Insignia` para activo/inactivo
  en vez del texto suelto de hoy, `Boton variante="peligro"` para "Borrar"
  en vez del underline rojo genérico.

Ningún cambio a `consultas/`, Server Actions de negocio, RLS ni migraciones
en estas cuatro secciones (salvo `color`, ya cubierto arriba).

## Ventas

- **Layout**: grid de 2 columnas — armar el pedido a la izquierda, carrito
  `sticky` a la derecha. Reemplaza el layout de una sola columna apilada.
- **Selector de formato**: de `<select>` a grilla de botones (arco, `aria-pressed`),
  mostrando nombre, gramos+cupo y precio en el propio botón.
- **Selector de sabores**: aparece al elegir un formato. Cada sabor es un
  botón con `Punto` + nombre + cuánto queda, deshabilitado si está agotado
  (usa `kgPorSabor`, ver arriba).
- **Cupo y auto-agregado** (Decisión 6): al llegar exactamente al cupo, el
  item se agrega solo; si el vendedor quiere parar antes, un botón manual
  "Agregar con estos sabores" queda visible mientras haya 1+ elegidos y
  falten para el cupo.
- **Carrito**: `ArcoCab` con "Pedido" + cantidad de items, líneas con
  `Punto` + sabor + precio + quitar (✕), total como pieza gráfica gigante
  (mono, signo chico). Medio de pago y "Cobrar" quedan inline (Decisión 7).
- **Últimas ventas**: estilo `.ticket` prestado (Decisión 8), misma
  ubicación ya decidida.

Ningún cambio a `registrar_venta`, `anular_venta`, `corregir_sabor_venta_item`,
`registrar_ajuste_balde` ni sus RLS — es exclusivamente la capa de
presentación sobre las mismas Server Actions que ya existen.

## Testing

- Un caso nuevo en `src/modulos/inventario/rls.test.ts`: no se puede
  insertar un sabor con `color` mal formado (mismo patrón que el test ya
  existente de "no se puede insertar un insumo con cantidad distinta de
  cero" — un `check` de columna, no una política de RLS, pero se prueba
  igual contra la base real).
- Sin tests nuevos de lógica pura para los componentes visuales — son
  presentación; `kgPorSabor` sí es lógica pura y se testea con Vitest
  normal (agrupar y sumar, casos: sin baldes, un balde, varios del mismo
  sabor).
- Verificación manual de cierre: recorrer las cinco pantallas (Sabores,
  Baldes, Insumos, Formatos, Ventas) confirmando que toda la funcionalidad
  ya probada en las fases anteriores se sigue comportando igual (alta,
  edición, activar/desactivar, abrir/ajustar balde, cobrar/anular/corregir
  sabor) — el rediseño no debería cambiar ningún resultado, solo cómo se ve.
- `npm run verificar` después de cada archivo/sección tocada, igual que en
  los planes anteriores.

## Fuera de alcance

- `nav__globo` (contador de alertas en el menú).
- Barra de navegación fija en mobile.
- Cualquier pantalla que el mockup tenga y no exista todavía como fase real
  (Historial, Caja, Panel, Clientes, Usuarios) — no se construyen acá.
- Modal de cobro o cualquier modal — el sistema real no tiene modales
  todavía y esto no los introduce.

## Después de aplicar todo: siembra de datos

Un archivo `.sql` aparte (no versionado como migración de esquema, es pura
data) que carga sabores con color, insumos y formatos de ejemplo, para que
el sistema no arranque vacío. Se escribe al final, una vez aplicada la
migración de `color` — el usuario elige en ese momento si usa el dataset
del mockup (Dulce de leche, Chocolate amargo, Pistacho...) o los productos
reales de Goro.
