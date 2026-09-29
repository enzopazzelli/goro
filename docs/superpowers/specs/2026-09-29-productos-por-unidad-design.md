# Productos por unidad, conos y formato "sin helado" — diseño

Fecha: 2026-09-29 · Estado: para revisión de Enzo

## Contexto y objetivo

Goro mandó dos listas de productos (mensajes de WhatsApp, 2026-09-29).

**Lista 1** — lo que se compra/vende por unidad o por docena, sin sabor:
bombón, palito, sándwich, cono bañado, cremita y vasito (100 g), cada uno
x1u y x12u. Más baldes de 10 L y 5 L (ya cubiertos por Stock) y térmicos de
1 kg, ½ kg y ¼ (ya cubiertos por formatos).

**Lista 2** — formatos de mostrador: cucurucho simple, cucurucho doble, canasta
doble, cucurucho dulce, vasito simple y cucuruchón dulce. Goro pidió precio
**con helado y sin helado** de cada uno.

Objetivo: que el sistema pueda (a) vender y descontar por unidad los productos de
la lista 1, (b) que cada cucurucho/canasta descuente su cono del stock al
venderse con helado, y (c) vender el cono suelto ("sin helado"), por unidad o
por docena. Éxito = cobrar en el mostrador una docena de bombones, un cucurucho
doble y un cono suelto, y que el stock de helado y de unidades cierre; anular
cualquiera devuelve exactamente lo descontado.

## Decisiones ya tomadas con Goro

- **Bocha = 65 g.** Simple = 1 bocha (65 g, 1 sabor). Doble = 2 bochas
  (130 g, 2 sabores). Cucurucho doble, cucurucho dulce, cucuruchón dulce y
  canasta doble son todos dobles. Cucurucho simple y vasito simple, 1 bocha.
- **El cucuruchón dulce es otro producto**: lleva glaseado de chocolate, así
  que su cono es distinto del cucurucho dulce.
- **Vasito x1u/x12u (lista 1) ≠ vasito simple (lista 2).** El de la lista 1
  lleva 100 g con dos sabores combinados, lo arman por adelantado cuando no hay
  clientes y **entra al stock por unidades** (ej. 100 vasitos). Es reventa pura,
  como el bombón.
- **La docena tiene precio propio** (precio por mayor), no es 12 × unidad.
  Vale para todos los productos de lista 1 y para los conos.
- **Cada cono es un producto con stock en unidades**: se descuenta al vender un
  formato con helado y se vende suelto (unidad o docena). Ese precio suelto es
  el "sin helado". No hace falta una columna `precio_sin_helado`.
- **Stock insuficiente no bloquea la venta**: queda negativo con alerta visible.
  El conteo es lo que está mal, no la venta.
- **Los precios los completa Goro después.** Todo se carga inactivo y sin precio.

### Costo aceptado

Como el vasito de 100 g entra por unidades, los kilos de helado que lleva no
se descuentan de ningún balde: el stock de sabores queda sobreestimado. Se
resuelve en la fase de armado de potes (peso real medido), no acá.

## Enfoque elegido

Extender `insumos` en lugar de crear una tabla `productos`: el insumo ya tiene
unidad, stock, mínimo, costo, código `GA` y un ledger (`movimientos_insumo`) que
nunca pisa el stock. Alternativas descartadas: tabla `productos` con ledger
propio (duplica ledger, mínimo y código); solo formatos sin stock de conos
(contradice el pedido de Goro).

Un "bombón" vive internamente en `insumos`; la interfaz lo puede rotular
"Productos".

## Modelo de datos

Todas las migraciones son **aditivas** (no hay staging; las ventas existentes no
se tocan).

### `presentaciones_insumo` (nueva)

| Columna | Detalle |
|---|---|
| `id` | identity, PK |
| `insumo_id` | FK a `insumos`, not null |
| `nombre` | "Unidad", "Docena"; check no vacío |
| `unidades` | cuántas unidades descuenta; check `> 0` |
| `precio` | pesos enteros; check `>= 0` |
| `activo` | boolean, default false |

- Índice único `(insumo_id, unidades)`: no dos "x12" del mismo insumo.
- Check `not activo or precio > 0`: una presentación no puede estar activa a $0.
- Un insumo es vendible si tiene alguna presentación activa. No se agrega precio
  al insumo.
- Sin `delete` para `authenticated`: se desactiva.

### `formato_insumos` (nueva)

`formato_id` FK, `insumo_id` FK, `cantidad integer > 0`, PK
`(formato_id, insumo_id)`. Un formato sin filas no consume nada (caso de hoy).

### `venta_items`

- `formato_id` pasa a nullable; se agrega `presentacion_id` nullable FK.
- Check: exactamente uno de los dos no es nulo.
- Una fila por cosa vendida (cinco bombones = cinco filas). Sin columna
  `cantidad` (YAGNI).
- El precio se congela en la fila, como hoy.

### `movimientos_insumo`

- Se agrega `venta_item_id` nullable FK (espeja `movimientos_balde`).
- Se agregan `venta` y `anulacion` al enum `tipo_movimiento_insumo` (hoy tiene
  `entrada`, `ajuste`). La migración de inventario anticipaba `consumo`; se usa
  `venta`/`anulacion` para espejar a `movimientos_balde`.
- `insumos` no tiene check `cantidad >= 0` y **no se agrega**: el stock puede
  quedar negativo por decisión de negocio.

## Lógica de servidor

Una operación de negocio = una transacción (AGENTS.md, regla 1).

- **`aplicar_movimiento_insumo`** (interna, `security definer`, sin grant a
  `authenticated`): inserta el movimiento con `venta_item_id` y suma el delta a
  `insumos.cantidad`. Solo la llaman `registrar_venta` y `anular_venta`.
- **`registrar_venta`**: cada ítem del `p_items` es de formato o de
  presentación.
  - Formato: lógica actual (balde abierto por sabor, kilos) **más** un
    movimiento `venta` por cada fila de `formato_insumos`.
  - Presentación: valida presentación e insumo activos, precio leído del
    servidor, movimiento `venta` de `-unidades`.
  - Cada tipo de ítem en su propia función auxiliar para respetar 100 líneas
    por función.
- **`anular_venta`**: además de los baldes, suma los movimientos de insumo de la
  venta agrupados por insumo y revierte el neto (`anulacion`).
- Comparación de rol siempre con `coalesce(auth_rol() = 'duenio', false)` donde
  aplique (AGENTS.md).

## Permisos (RLS)

- Cualquier sesión activa lee `presentaciones_insumo` y `formato_insumos`.
- Solo el dueño inserta y edita ambas. Nadie borra presentaciones.
- `aplicar_movimiento_insumo` no es ejecutable desde el navegador.
- `rls.test.ts` de cada módulo tocado cubre lo que **no** puede hacer cada rol.

## Pantallas

Se extienden las existentes, sin módulos nuevos:

- **Stock, insumos**: presentaciones por insumo (x1, x12) con precio y
  interruptor de activo; alerta cuando el stock es negativo.
- **Catálogo de formatos**: el formulario suma "consume" (insumo + cantidad).
- **Mostrador**: sección de productos con las presentaciones activas; tocar una
  la agrega al ticket sin elegir sabores.
- Límite de 200 líneas por archivo: cada pieza nueva en su propio componente,
  sin engordar `SelectorFormatoYSabores`.

## Carga inicial (datos, después de la migración)

Todo inactivo y sin precio hasta que Goro los pase:

- Formatos: cucurucho simple (65 g, 1 sabor); cucurucho doble, cucurucho dulce,
  cucuruchón dulce y canasta doble (130 g, 2 sabores cada uno); vasito simple
  (65 g, 1 sabor). Cada uno con su cono en `formato_insumos`.
- Insumos: los conos (simple, doble, canasta, dulce, cucuruchón) y los productos
  de lista 1 (bombón, palito, sándwich, cono bañado, cremita, vasito 100 g), con
  presentaciones x1 y x12.

## Pruebas

- Vender un cucurucho doble baja los kilos del balde y 1 cono, en la misma
  transacción.
- Vender una docena baja 12; anular devuelve exactamente lo descontado.
- Vender sin stock deja el insumo negativo y no falla.
- Un ítem con formato y presentación a la vez, o con ninguno, lo rechaza el
  check de la base.
- El índice único impide dos presentaciones de igual `unidades` por insumo.
- No se puede activar una presentación con precio 0.
- El precio cobrado no cambia si después se edita la presentación.
- Ana (empleada) no puede crear ni editar presentaciones ni `formato_insumos`;
  `aplicar_movimiento_insumo` no es invocable desde el cliente.

## Orden de construcción

1. Presentaciones y su UI en Stock, más carga de insumos de las dos listas.
2. `formato_insumos` y carga de los seis formatos de lista 2.
3. Vender presentaciones en el mostrador, descuento de conos por formato y
   anulación.

Cada paso termina en algo que Goro puede tocar.

## Fuera de alcance

- Descontar de un balde el helado del vasito de 100 g (queda para el armado de
  potes con peso real).
- Escaneo con pistola y códigos de los productos (Fase 3/4).
- Costos y márgenes de estos productos: se pueden cargar en `insumos.costo`
  cuando Goro los tenga, pero no hay pantalla de margen todavía.
