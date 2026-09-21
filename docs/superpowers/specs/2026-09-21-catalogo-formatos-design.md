# Fase 2b — Catálogo: formatos y precios editables

Estado: aprobado en brainstorming, pendiente de plan de implementación.
Fecha: 2026-09-21.

## Contexto

Fase 2 (Inventario: sabores, insumos, baldes) está aplicada y verificada.
Esta fase construye la tabla `formatos` (Sección 4 del ROADMAP: "Formatos y
precios, catálogo, no código") — lo que en el mockup está escrito en el HTML
(cucurucho, doble, vasito, 1/4, 1/2, kilo) pasa a ser datos que Goro edita
desde una pantalla.

Entregable verificable (ROADMAP): Goro crea el formato "Pote 2 kg, 6
sabores", le pone precio, y esa misma tarde está disponible sin que nadie
toque código.

## Decisiones de alcance (brainstorming)

1. **Solo la tabla `formatos`.** La relación formato↔insumos que consume
   ("un kilo se lleva un pote de 1 kg y seis cucharitas") queda para Fase 4
   (Ventas): hoy nadie la consumiría, y armar ese modelo antes de que Ventas
   defina cómo descuenta insumos es diseñar para un requerimiento que otra
   fase todavía no fijó. Las migraciones son aditivas — no cuesta nada
   agregarla después.
2. **`sabores.precio_balde` queda para más adelante** (el precio de vender
   un balde entero, que depende del sabor) — mismo criterio: no hay pantalla
   de venta de balde entero hasta Fase 4/9.
3. **El balde entero NO es una fila de `formatos`.** `formatos.precio` es "el
   mismo precio sin importar el sabor" por diseño; el balde es exactamente
   lo contrario (precio por sabor). Mezclar los dos en una tabla obliga a
   admitir un `precio` nulo o un caso especial. Vender un balde entero se
   resuelve aparte, contra `baldes` + el futuro `precio_balde`.
4. **Se puede borrar un formato**, a diferencia de `sabores`/`insumos`. Es a
   pedido explícito: un formato creado por error tiene que poder
   desaparecer, no quedar desactivado para siempre. Ver la nota de FK más
   abajo sobre por qué esto no necesita protección adicional.
5. **Edición completa, no solo alta.** Nombre, gramos, cantidad de sabores y
   precio de un formato existente se pueden editar — así subir el precio del
   kilo es editar una fila, no crear una nueva y desactivar la vieja.
6. **Vive dentro de `src/modulos/inventario/` y de la página `/inventario`**,
   como una sección más (no un módulo ni una ruta nueva). Decisión explícita
   del usuario en el brainstorming, contra la recomendación inicial de un
   módulo separado — con una heladería de un solo local, una entrada de menú
   más no aporta y el módulo ya comparte el mismo tipo de catálogo dueño-edita
   / todos-leen que Sabores e Insumos.

## Modelo de datos

```sql
create table public.formatos (
  id                integer generated always as identity primary key,
  nombre            text not null unique,   -- "1 kilo", "Pote 2 kg"
  gramos            integer not null,
  cantidad_sabores  integer not null,       -- cuántos entran; el mostrador lo usa para el cupo
  precio            integer not null,       -- pesos enteros, mismo criterio que costo en insumos/baldes
  activo            boolean not null default true,
  creado_en         timestamptz not null default now(),
  constraint nombre_no_vacio check (length(trim(nombre)) > 0),
  constraint gramos_positivo check (gramos > 0),
  constraint cantidad_sabores_positiva check (cantidad_sabores >= 1),
  constraint precio_no_negativo check (precio >= 0)
);
```

Sin secuencia ni columna `codigo`: un formato no es un objeto físico que la
pistola necesite leer (Sección 1 del ROADMAP) — es una fila de catálogo, como
`sabores`.

## RLS

Mismo patrón que `insumos` (catálogo: cualquier sesión activa lee, solo
dueño escribe), con una diferencia: acá `delete` sí se otorga.

```sql
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

### Por qué "se puede borrar" no necesita más lógica que esto

Hoy no existe tabla de ventas, así que ahora mismo *cualquier* formato se
puede borrar sin restricción — que es exactamente el caso de uso pedido
("lo creé por error"). El día que Fase 4 agregue la línea de venta con
`formato_id integer not null references public.formatos (id)` (sin
`on delete cascade`), esa foreign key va a rechazar sola cualquier intento de
borrar un formato que ya tenga una venta encima — Postgres tira el error de
violación de FK, no hace falta escribir ningún chequeo de "¿tiene ventas?" a
mano. Recién en ese momento borrar deja de ser una opción real para un
formato usado, y `activo` pasa a ser el único camino para retirarlo. Nada de
esto se construye en esta fase: es una consecuencia automática de una FK que
otra fase va a agregar.

## Pantallas

Todo dentro de `src/modulos/inventario/`, como una sección más de la página
`/inventario` (sin entrada de menú nueva):

```
src/modulos/inventario/
  tipos.ts                          + type Formato
  consultas/
    formatos.ts                     listarFormatos()
    accionesFormatos.ts             crearFormato, editarFormato, eliminarFormato
                                     (archivo aparte de acciones.ts: ya está en
                                     189/200 líneas, sumar 3 funciones más lo rompe)
  componentes/
    FormularioFormato.tsx           alta — mismo patrón que FormularioSabor,
                                     usa useAccionConReset
    FilaFormato.tsx                 una fila: edición inline (nombre, gramos,
                                     cantidad de sabores, precio, activo) +
                                     botón "Borrar" en un form aparte
    SeccionFormatos.tsx             tabla + alta, Server Component (async),
                                     se monta en page.tsx junto a
                                     Sabores/Baldes/Insumos
```

`page.tsx` agrega `<SeccionFormatos esDuenio={esDuenio} />` a las tres
secciones existentes.

### Notas de buenas prácticas de frontend (React/Next.js)

- `SeccionFormatos` es Server Component: un solo fetch (`listarFormatos()`),
  sin nada que paralelizar con `Promise.all` (a diferencia de
  `SeccionBaldes`, que sí combina tres fuentes).
- `FilaFormato` es su propio componente en su propio archivo, no una función
  definida dentro del `.map()` de `SeccionFormatos` — evita reconstruir el
  componente en cada render del padre.
- La autorización real sigue siendo RLS, no un chequeo de rol dentro de la
  Server Action — mismo criterio que `crearSabor`/`crearInsumo`: la acción
  solo traduce el rechazo de Postgres a un mensaje.
- El borrado pide confirmación con un `onSubmit` que llama a `confirm()` del
  navegador (`if (!confirm(...)) event.preventDefault()`) — sin librería de
  modal, es la primera acción destructiva del módulo.
- **Fuera de esta fase**: envolver cada sección de `/inventario` en
  `<Suspense>` para que la página haga streaming en vez de esperar a las
  cuatro secciones juntas. Sería una mejora real, pero hoy ninguna de las
  tres secciones existentes la tiene — mezclarla acá sale del alcance de
  "agregar Formatos" y conviene tratarla como una mejora de página completa,
  aparte.

## Testing

- **Sin función pura que testear con Vitest**: a diferencia de
  `saborEnAlerta`, acá no hay regla de negocio para aislar — crear/editar/
  borrar son validación de formulario + operación directa sobre la tabla,
  mismo criterio que `crearSabor`/`crearInsumo` (sin test unitario propio).
- **`rls.test.ts`** (se extiende el archivo existente del módulo, no uno
  nuevo — tiene margen: techo de 400 líneas para tests, hoy ronda 200):
  casos nuevos para `formatos` — un colaborador no puede crear, editar ni
  borrar; el dueño puede las tres cosas; sin sesión no se lee nada.
- Migración: se escribe el archivo, **no se aplica** — la corre el usuario a
  mano en el SQL Editor de Supabase, mismo criterio que Núcleo e Inventario.
- Verificación manual de cierre de fase (mismo patrón que el Task 10 de
  Fase 2): crear un formato, editarle el precio, borrar uno "por error", y
  confirmar que un colaborador no ve ninguno de los tres formularios (alta,
  edición, borrado) pero sí la tabla de formatos activos.

## Fuera de alcance de esta fase

- Relación formato↔insumos consumidos (Fase 4).
- `sabores.precio_balde` y la venta de balde entero (Fase 4/9).
- Cualquier pantalla de venta/mostrador (Fase 3/4) — esta fase termina en un
  catálogo editable, no en algo que cobre.
- `<Suspense>` por sección en `/inventario` (mejora de página completa,
  fuera de este cambio).

## Migración

Archivo nuevo, no se toca la de Inventario:
`supabase/migrations/20260921090000_catalogo.sql`.
