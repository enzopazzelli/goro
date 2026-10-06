# Módulo de descarte — diseño

> Pedido de Goro en la demo del 2026-10-06. Aprobado en charla con Enzo el mismo día.

## Para qué

Goro quiere saber **cuánto pierde por lo que se tira**, en kilos/unidades y en plata,
por período, y **qué es lo que más se tira** (qué sabor, qué producto) para producir o
comprar menos de eso.

Hoy esa pérdida no se ve en ningún lado:

- "Se terminó" en un balde abierto da de baja lo que el sistema creía que quedaba como
  un `ajuste`. Ahí se mezclan el error de estimación de la venta (que descuenta gramos
  teóricos) con el resto que de verdad se tiró.
- Descartar un pote cambia su estado, pero no queda cuándo ni por qué, ni cuánto costaba.
- Un producto o un insumo que se tira solo se puede bajar como `ajuste` con un texto libre.
- El margen del Panel ignora todo esto.

## Qué se descarta

Las cuatro cosas, con el mismo registro:

| Qué                           | Por dónde se carga                     | Cantidad            |
| ----------------------------- | -------------------------------------- | ------------------- |
| Resto de un balde abierto     | Inventario → balde → "Se terminó"      | kg, **se tipea**    |
| Pote armado                   | Potes → "Descartar"                    | el peso del pote    |
| Producto (paleta, bombón…)    | Pantalla nueva **Descarte**            | unidades            |
| Insumo o envase               | Pantalla nueva **Descarte**            | su unidad (u o kg)  |

**La cantidad la dice la persona**, pesada en la balanza o a ojo. Nunca se toma como
descarte "lo que el sistema creía que quedaba": eso es justo la mezcla que hoy no deja
ver nada.

**Puede cargar cualquiera con sesión.** Es lo que pasa en el mostrador, en el momento;
si hace falta un permiso, no se carga. Queda registrado quién fue. Esto **cambia una
decisión anterior**: descartar un pote pedía `cargar_inventario` (bitácora 2026-10-04) y
deja de pedirlo, para que las cuatro puertas tengan la misma regla.

**La plata la ve solo el dueño** en pantalla, como el resto de los costos. La base no la
esconde (los costos de insumos y baldes ya son legibles para cualquier sesión); es la
misma convención que el Panel.

## Datos

### Tabla `descartes`

Una fila por cosa tirada. Solo de lectura para `authenticated` (cualquier sesión activa,
con política propia en el `where`, regla 1.2); se escribe únicamente desde las funciones
de abajo.

| Columna        | Tipo                     | Notas                                                                 |
| -------------- | ------------------------ | --------------------------------------------------------------------- |
| `id`           | identity                 |                                                                       |
| `tipo`         | enum `tipo_descarte`     | `balde` · `pote` · `insumo`                                           |
| `balde_id`     | fk `baldes`              | Para `balde` y `pote` (el balde del que salió el pote): agrupa por sabor |
| `pote_id`      | fk `potes`               | Solo para `pote`                                                      |
| `insumo_id`    | fk `insumos`             | Solo para `insumo`                                                    |
| `cantidad`     | numeric                  | `check (cantidad > 0)`                                                |
| `unidad`       | enum `unidad_insumo`     | **Congelada**: `kg` para balde y pote, la del insumo en ese momento   |
| `motivo`       | enum `motivo_descarte`   | `resto_de_balde` · `vencido` · `roto` · `derretido` · `otro`          |
| `nota`         | text, null               | `check (nota is null or length(nota) <= 200)`                         |
| `costo`        | integer                  | **Congelado** en pesos enteros; `check (costo >= 0)`                  |
| `clave`        | uuid, null               | Idempotencia de la pantalla Descarte                                  |
| `creado_por`   | fk `perfiles`            |                                                                       |
| `creado_en`    | timestamptz              | `default now()`                                                       |

Restricciones (regla 4: lo que valida la pantalla existe también acá):

- Exactamente lo que corresponde a cada tipo:
  `balde` → `balde_id` sí, `pote_id` y `insumo_id` no;
  `pote` → `pote_id` y `balde_id` sí, `insumo_id` no;
  `insumo` → `insumo_id` sí, los otros dos no.
- `motivo = 'resto_de_balde'` solo si `tipo = 'balde'`. Al revés no se exige: el día
  que se pueda tirar una parte de un balde sin terminarlo ("se cayó medio kilo"), ese
  descarte es de tipo `balde` con otro motivo.
- `unidad = 'kg'` para `balde` y `pote`.
- **Un pote se descarta una sola vez:** índice único parcial sobre `pote_id`
  `where pote_id is not null` (regla 3). El `for update` + cambio de estado ya lo evita;
  el índice lo hace imposible.
- **Idempotencia:** índice único parcial sobre `clave` `where clave is not null`
  (regla 5, mismo patrón que `ventas.clave_idempotencia`).

Índices de lectura: `creado_en` (el reporte filtra por período).

### Costo congelado (regla 6)

Se calcula en la función, en el momento del descarte, y se redondea a pesos:

- **Balde:** `kg × baldes.costo / baldes.kg_inicial`.
- **Pote:** `peso_g / 1000 × costo / kg_inicial` del balde del que salió. El envase de un
  pote descartado no se cuenta (hoy un pote descartado tampoco lo descuenta del stock).
- **Insumo:** `cantidad × insumos.costo` de ese momento.

### Tipos nuevos en los ledgers

- `tipo_movimiento_balde` suma `descarte`.
- `tipo_movimiento_insumo` suma `descarte`.

Un valor de enum agregado no se puede usar en la misma transacción que lo agrega, y
cada migración corre en una transacción. Por eso van **dos migraciones**: la primera solo
agrega los valores de enum; la segunda crea la tabla y las funciones que los usan.

## Funciones (una operación = una transacción, regla 1.5)

Todas `security definer`, con `search_path` fijo, cerradas a `anon` y con el chequeo de
sesión NULL-safe: `if not coalesce(public.auth_rol() is not null, false)`.

### `vaciar_balde(p_balde_id integer, p_kg_tirado numeric default 0)`

Reemplaza a la actual (cambia la firma: se borra la vieja, como se hizo con
`registrar_venta`).

1. `for update` del balde; tiene que estar `abierto` (si no, el mismo error de hoy).
2. `p_kg_tirado` entre `0` y `kg_inicial` (`check` en la función; error claro si no).
3. Ajuste de estimación: si `p_kg_tirado <> kg_restante`, un movimiento `ajuste` por
   `p_kg_tirado - kg_restante` (puede ser positivo: el sistema creía que quedaba menos
   de lo que se tiró). Después de esto, `kg_restante = p_kg_tirado`.
4. Si `p_kg_tirado > 0`: movimiento `descarte` por `-p_kg_tirado` y fila en `descartes`
   (`tipo = 'balde'`, `motivo = 'resto_de_balde'`, costo congelado).
5. Estado `vacio`, `salio_en = now()`, como hoy.

El balde termina siempre en `kg_restante = 0`, igual que ahora. Lo único nuevo es que la
baja se parte en "error de estimación" y "se tiró", y la segunda tiene costo y fila.

No lleva clave: el `for update` + "solo un balde abierto se vacía" ya hace que el segundo
intento falle sin duplicar nada.

### `descartar_pote(p_pote_id integer, p_motivo motivo_descarte, p_nota text default null)`

Reemplaza a la actual (cambia la firma).

1. Sesión activa (se quita el chequeo de `cargar_inventario`, ver "Qué se descarta").
2. `for update`; tiene que estar `impreso`, como hoy.
3. `p_motivo <> 'resto_de_balde'`.
4. Estado `descartado` y fila en `descartes` (`tipo = 'pote'`, `cantidad = peso_g / 1000`,
   `unidad = 'kg'`, `balde_id` del pote, costo congelado).

El helado no vuelve al balde: ya había salido al armar el pote (movimiento `armado`).

### `descartar_insumo(p_insumo_id integer, p_cantidad numeric, p_motivo motivo_descarte, p_nota text, p_clave uuid)`

1. Si ya existe un descarte con `p_clave`, devuelve su `id` sin hacer nada más (regla 5).
2. `p_cantidad > 0`; si el insumo se cuenta en `u`, entera.
3. **No se puede tirar más de lo que hay en stock**:
   *"El sistema tiene 3 de Cucurucho; no se pueden descartar 5. Avisale al dueño para
   corregir el stock."* Frena el `50` donde iba `5`, que inflaría el reporte en plata.
4. `p_motivo <> 'resto_de_balde'`.
5. `aplicar_movimiento_insumo(..., 'descarte', -p_cantidad, null, motivo)` (ya congela el
   costo unitario en el movimiento) y fila en `descartes`
   (`insert ... on conflict (clave) where clave is not null do nothing`, y si perdió la
   carrera devuelve el `id` existente, como `registrar_venta`).

Devuelve el `id` del descarte.

### `costo_del_descarte(p_desde timestamptz, p_hasta timestamptz)`

`returns numeric`, `stable`, para la línea del Panel. Suma `descartes.costo` del período.
Con su propio filtro de sesión en el `where` (regla 1.2).

## Pantallas

### Inventario → balde abierto → "Se terminó"

El `confirm()` de hoy pasa a un `Modal` (el componente compartido):

> **¿Se terminó el balde GB0000042 (Frutilla)?**
> El sistema calculaba que quedaban 0,40 kg.
> **¿Cuánto se tiró?** `[      ] kg` — vacío o 0 = no se tiró nada
> [Cancelar] [Se terminó]

El campo arranca vacío, no con la estimación: si arrancara con 0,40, apretar Enter
registraría como descarte justo el número que no queremos.

### Potes → "Descartar"

El `confirm()` pasa a un `Modal` con el motivo (Vencido · Se rompió o se cayó · Se
derritió · Otro, los mismos de la pantalla Descarte) y nota opcional. "Anular" no cambia.

### Pantalla nueva `/descarte`

En el menú para todos los roles: `{ href: "/descarte", etiqueta: "Descarte", icono: "🗑️" }`.

**Registrar** (todos):

- Campo de código: se escanea o se tipea el código de un insumo/producto/envase y Enter;
  el foco pasa a la cantidad (mismo patrón que Recibir por código). La búsqueda usa la
  función `resolver_codigo` desde las consultas del propio módulo. Si el código es de un
  pote o de un balde, dice dónde se descarta eso (Potes / Inventario) en vez de fallar
  mudo.
- O elegir de una lista (agrupada: Productos · Insumos · Envases, solo activos).
- Cantidad (con la unidad al lado), motivo (Vencido · Se rompió o se cayó · Se derritió ·
  Otro), nota opcional, botón **Descartar**.
- La clave de idempotencia se genera con `nuevaClave()` y cambia después de cada
  descarte exitoso.

**Hoy** (todos): lo descartado hoy, lo más nuevo arriba: hora, qué, cantidad, motivo.
El dueño ve además el costo y quién lo cargó (los nombres de otros solo los lee el dueño,
por RLS de `perfiles`).

**Resumen** (solo el dueño):

- `FiltroDePeriodo` (el mismo de Historial).
- Total del período en plata.
- **Lo que más se tira**, ordenado por plata: por sabor (baldes y potes juntos, en kg) y
  por producto/insumo (en su unidad), con cantidad y costo.
- Por motivo: cantidad de descartes y plata.
- **Descargar Excel**.

Los archivos se parten para quedar bajo 200 líneas por archivo y 100 por función.

### Panel

En `MargenDelPeriodo`, debajo del margen: **"Se tiró $X"**, con enlace a `/descarte` con el
mismo período. No se resta del margen: el margen es de lo vendido; el descarte se muestra
al lado, para que se vea junto.

### Excel

Nuevo libro `descarte` en `src/app/exportar/[tipo]/route.ts`, solo para el dueño, leído
con `leerTodo` de a mil filas y fallando entero si una página falla.

Columnas: fecha y hora · qué (sabor o nombre del insumo) · tipo · cantidad · unidad ·
motivo · nota · costo · quién. La **nota** y los **nombres** pasan por `sanearTexto`.

## Estructura

```
supabase/migrations/
  20261006100000_descarte_tipos.sql      enum values nuevos (solo eso)
  20261006110000_descarte.sql            tabla, índices, RLS, funciones
src/modulos/descarte/
  componentes/   FormularioDescarte, ListaDeHoy, ResumenDeDescarte,
                 RankingDeDescarte (se parten más si pasan el tope de líneas)
  consultas/     acciones.ts (descartar insumo), descartes.ts (lecturas),
                 exportar.ts
  resumen.ts     agregación pura: filas → totales, ranking, por motivo
  tipos.ts
  rls.test.ts
src/app/(app)/descarte/page.tsx
```

Cambian además: `BotonVaciarBalde` (modal), `FilaDePote` (modal con motivo), las acciones
`vaciarBalde` y `descartarPote`, `config/navegacion.ts`, el Panel (`MargenDelPeriodo` y su
consulta) y la ruta de exportar.

El Panel no importa de `modulos/descarte/consultas`: llama a `costo_del_descarte` desde su
propia consulta.

## Errores

- Toda función devuelve mensajes en español que la pantalla muestra tal cual, como hoy
  (`lib/errores.ts`).
- Si la sesión venció, el mensaje de siempre.
- Doble clic en Descartar: la clave hace que el segundo pedido devuelva el mismo descarte.

## Pruebas

**RLS / base** (`modulos/descarte/rls.test.ts`, `npm run test:rls`):

- `anon` no lee `descartes`; nadie inserta, edita ni borra directo.
- Sin sesión, las tres funciones fallan.
- Un colaborador sin `cargar_inventario` **puede** descartar (balde, pote, insumo).
- `vaciar_balde` con 0: sin fila de descarte, balde vacío, ledger cierra en 0.
- `vaciar_balde` con más de lo estimado: ajuste positivo + descarte; `kg_restante` final 0.
- `vaciar_balde` con más que `kg_inicial`: rechazado, nada cambia.
- `descartar_pote` dos veces: la segunda falla; una sola fila.
- `descartar_insumo` con la misma clave dos veces: un solo movimiento y una sola fila.
- `descartar_insumo` por más que el stock: rechazado.
- `descartar_insumo` con fracción en un insumo por unidad: rechazado.
- Costo congelado: cambiar `insumos.costo` después no cambia `descartes.costo`.
- `motivo = 'resto_de_balde'` en un insumo: rechazado.
- Los tests existentes de `vaciar_balde` y `descartar_pote` se actualizan a la firma nueva
  (y el que exige `cargar_inventario` para descartar un pote se invierte).

**Unitarios** (`npm run test:unit`):

- `resumen.ts`: totales, ranking ordenado por plata, sabores de balde y pote sumados,
  unidades distintas que no se mezclan, período vacío.
- Excel del descarte: una nota que empieza con `=` sale saneada.
- Componentes: el modal de "Se terminó" manda el kg tipeado y vacío como 0; el
  formulario de descarte pasa el foco a la cantidad después de un código.

## Fuera de esta versión

- Descartar un **balde cerrado** entero (falla del freezer).
- Tirar **una parte** de un balde abierto sin darlo por terminado.

Las dos entran después con una función más, sin cambiar la tabla.

## Antes de desplegar

Aplicar las dos migraciones **en orden** y **antes** del código (las acciones nuevas
llaman a las firmas nuevas), y correr `npm run test:rls`.
