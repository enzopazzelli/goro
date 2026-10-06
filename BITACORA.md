# BITÁCORA — sistema Goro

> Registro cronológico de qué se hizo, qué se decidió y por qué.
> **Lo más nuevo arriba.**
>
> El plan está en [`ROADMAP.md`](ROADMAP.md) · las convenciones en
> [`AGENTS.md`](AGENTS.md) · el tablero de todos los proyectos en
> [`../ESTADO.md`](../ESTADO.md).

---

## Para qué sirve

El `ROADMAP.md` dice **qué falta**. La bitácora dice **cómo llegamos hasta acá**.

Enzo alterna entre el IDE, la consola y Claude Desktop, así que la sesión
anterior puede no estar en el historial de chat de la siguiente. Este archivo
es el único punto de continuidad: se leen las últimas tres entradas y ya se sabe
dónde está todo parado.

Y sirve para reconstruir **por qué** se tomó una decisión que hoy parece rara.
El commit dice qué cambió; la bitácora dice qué estábamos pensando.

## Cuándo se escribe una entrada

| Momento | Obligatorio |
|---|---|
| Al cerrar una jornada de trabajo con avance real | ✅ |
| Al cerrar un paso del roadmap | ✅ |
| Al terminar una reunión con Goro | ✅ |
| Al descubrir algo que cambia el plan | ✅ |
| Al arreglar un typo o hacer un commit menor | ❌ |

**Una entrada por sesión de trabajo, no una por commit.** Si en una tarde
cerraste tres cosas, es una sola entrada.

## Formato

```markdown
## AAAA-MM-DD — Título corto de qué pasó

### Qué se hizo
Lo concreto.

### Qué se decidió
Decisiones tomadas y por qué. Lo que se descartó también cuenta.

### Qué queda pendiente
El siguiente paso, en una línea, para poder retomar sin releer nada.
```

---

## 2026-10-06 — Lo que pidió Goro en la demo: descarte, botones y letra más grandes

### Qué se hizo

Enzo le mostró el sistema a Goro y salieron cuatro pedidos.

- **Botones de verdad.** Editar, Guardar, Guardar precio, Anular, Salir y el resto eran
  texto subrayado chico. `Boton` suma el tamaño `chico` (alto de dedo) y `clasesDeBoton`
  para los `Link`; lo que borra o tira va en `peligro`. La flechita que abre un sabor,
  un insumo o un producto también pasó a botón.
- **Letra más grande en Ventas.** Tarjetas de formato, sabor, balde y producto, el carrito,
  el total y el campo de código. Los tamaños de las tarjetas viven en
  `modulos/ventas/componentes/estilosDeVenta.ts` para que crezcan juntas. Solo Ventas: el
  resto del sistema queda igual.
- **Rótulos en el sabor desplegado.** Mínimo y precio del balde solo decían "default"
  adentro; ahora tienen rótulo visible ("Mínimo (kg)", "Precio balde entero ($)"), igual
  que el ajuste de un balde, el nombre y el color.
- **Módulo de descarte** (diseño en `docs/superpowers/specs/2026-10-06-descarte-design.md`):
  - Tabla `descartes`: una fila por cosa tirada con el costo **congelado** ese día, y el
    stock baja por su ledger en la misma transacción (tipo `descarte`).
  - "Se terminó" pregunta **cuánto se tiró**. Lo tirado es descarte; la diferencia con lo
    que el sistema estimaba queda como ajuste, para un lado o para el otro.
  - Descartar un pote pide el motivo.
  - Pantalla nueva **Descarte**: se escanea o se elige un producto, insumo o envase, se
    pone la cantidad y el motivo. El dueño ve además cuánto se tiró en el período, lo que
    más se tira (ordenado por plata), por qué motivo, y el Excel.
  - Panel: "Se tiró $X" debajo del margen, sin restarlo.
  - Migraciones `20261006100000_descarte_tipos.sql` y `20261006110000_descarte.sql`
    (escritas, con sus tests en `modulos/descarte/rls.test.ts`; **falta aplicarlas**).
- La lectura del código de un artículo subió a `lib/articuloDelCodigo.ts`: la usan
  Recibir por código y Descarte.
- Guía de uso con la sección 9 nueva (Descarte); las siguientes se renumeraron.
- 307 tests unitarios; `npm run verificar` y `npm run build` pasan.

### Qué se decidió

- **La cantidad tirada la dice la persona**, pesada o a ojo. Nunca se toma como descarte
  lo que el sistema creía que quedaba: es la mezcla que no dejaba ver nada.
- **Descarta cualquiera con sesión**, también un pote. Cambia lo del 04/10, cuando
  descartar un pote pedía `cargar_inventario`: con un permiso de por medio, en el
  mostrador no se carga.
- **No se descarta un artículo por más de lo que hay en stock**: frena el `50` donde iba
  `5`. Si el stock está mal, lo corrige quien puede.
- En "Se terminó" el campo **arranca vacío** (con la estimación adentro, un Enter la
  registraría como descarte) y pide confirmar si lo tipeado supera en más de 0,5 kg lo
  estimado.
- El Panel muestra lo tirado **al lado** del margen, no restado: el margen es de lo vendido.
- Quedó afuera: descartar un balde cerrado entero (falla del freezer) y tirar una parte de
  un balde abierto sin terminarlo. Entran después sin cambiar la tabla.

### Qué queda pendiente

1. **Aplicar las dos migraciones de descarte, en orden, ANTES de desplegar** y correr
   `npm run test:rls` (los 13 de `modulos/descarte/rls.test.ts` y el de potes invertido).
2. Mirar en pantalla los botones nuevos y la letra de Ventas con Goro.

---

## 2026-10-04 — Todo lo de los códigos que se puede hacer sin la pistola

### Qué se hizo

Goro todavía no tiene la pistola, y Enzo tiene que mostrarle el sistema, así que
se adelantó todo lo que no depende del hardware. Una pistola de código de barras
es un teclado que tipea el código y aprieta Enter: **todo se prueba tipeando el
código**, y cuando llegue la pistola no se cambia nada. La venta de cucuruchos y
demás no depende de esto y sigue andando a mano.

- **Potes armados (pantalla `/potes`).** Se elige formato y sabor, se pesa, se
  tipea lo que marcó la balanza y se arma: el pote nace con su código, su peso
  real y su precio congelado, y el helado sale del balde abierto por el ledger.
  Se imprime su etiqueta, y se puede anular (armado por error: el helado vuelve)
  o descartar (merma: no vuelve, y lo decide quien tiene `cargar_inventario`).
- **Campo de código en Ventas.** Se escanea o se tipea; `resolver_codigo` dice
  qué es: un pote se cobra a su precio congelado, un balde cerrado se vende
  entero (ESE balde, no el más viejo del sabor), un producto se vende por unidad.
  Un pote o balde puntual no entra dos veces al mismo ticket.
- **Etiquetas imprimibles (`/codigos`).** Hoja de artículos (insumos y productos,
  para pegar en el estante), hoja de baldes y la prueba de la pistola. Se imprime
  solo la hoja (CSS de impresión), con etiquetas de 63,5 × 38 mm, tres por fila.
- **Recibir mercadería por código** (Inventario → Cargar): se escanea el insumo,
  se tipea cuántos llegaron, Enter. El Enter de la pistola pasa a la cantidad.
- **Migración `20261004100000_potes_y_codigos.sql`** (escrita, con sus tests;
  **falta aplicarla**): tabla `potes`, `armar_pote`, `anular_pote`,
  `descartar_pote`, `cobrar_item_pote`, `resolver_codigo`, y los potes dentro de
  los kilos, el costo y el ranking del Panel.
- 258 tests unitarios; `npm run verificar` y `npm run build` pasan.
- **Para dejar el sistema listo para entregar:** `supabase/limpiar_datos_de_prueba.sql` (vuelve
  todo a 0 y conserva usuarios y catálogo), `docs/guia-de-uso.html` (guía para quien usa
  el sistema) y `docs/guia-de-traspaso.md` / `.html` (guía para quien lo mantiene: entregar
  GitHub, Supabase y Vercel, backups, vaciar la base, recuperar accesos, problemas).

- **El nombre del comercio, en un solo lugar.** El nombre todavía es provisorio, así que se
  centralizó en `src/config/comercio.ts` (`NOMBRE_COMERCIO`, `RUBRO_COMERCIO`, descripción): de ahí
  salen el menú, el ingreso, el título, la descripción del sitio y el nombre de los Excel
  (`lib/slug.ts`). "Goro" como persona pasó a "el dueño" en las pantallas. La guía de uso tiene un
  bloque `COMERCIO` al final. No se tocan a propósito el dominio de correos internos, el prefijo `G`
  de los códigos (está en `check`s de la base y en las etiquetas impresas) ni el nombre del paquete.
- **README de la raíz reescrito:** decía que no había núcleo ni auth.

### Qué se decidió

- **El pote es de UN balde (un sabor).** Un formato de varios sabores se sigue
  cobrando a mano en Ventas, como hasta ahora.
- **El peso se tipea.** La balanza solo pesa y muestra. La base frena un peso
  fuera de 50 %–150 % del formato (un 2620 donde iba 262) y un balde al que no le
  queda lo que pesa el pote.
- **Un pote no se cobra dos veces:** `for update` y cambio de estado en la misma
  transacción (el cobro simultáneo lo ve vendido y avisa), probado con dos cobros
  a la vez. Anular la venta lo devuelve al freezer; el helado sigue fuera del balde.
- **El envase de un pote se descuenta al venderlo**, como en cualquier formato; un
  pote descartado no lo descuenta (hoy es una imprecisión chica, anotada).
- **El código sigue sin llevar datos adentro.** El precio y el peso van impresos
  en la etiqueta para leerlos a ojo; lo que cobra el sistema sale de la base.
- **Impresión en hoja A4.** La impresora de etiquetas sigue sin decidirse (0.3);
  la salida es una hoja con el `id` `hoja-de-etiquetas` y se cambia sin tocar nada más.

### Qué queda pendiente

1. (Ya aplicada; los 120 tests de base pasan.) **Aplicar `20261004100000_potes_y_codigos.sql` ANTES de desplegar el código**
   (la pantalla de Potes y el historial de ventas la necesitan) y correr
   `npm run test:rls`: los tests nuevos están en `potes/rls.test.ts`. El SQL no se
   pudo ejecutar desde acá.
2. Con la pistola real: la prueba de lectura (0.2) y la etiqueta 24 h en el
   freezer (0.3). Es lo único que no se adelantó.
3. Decidir la impresora de etiquetas; hoy se imprime en hoja A4.
4. Probar a mano: armar un pote, imprimir su etiqueta, cobrarlo tipeando el
   código, anular la venta, recibir mercadería por código.

---

## 2026-10-03 — Los pendientes del Panel y las Fases 8, 9 y 10

### Qué se hizo

Se empezó por lo que quedó señalado al revisar el Panel, y después las tres
fases que faltaban de la lista de módulos pedidos. Las tres migraciones nuevas ya están aplicadas en Supabase y
`npm run test:rls` pasa entero (108 tests; el único ajuste fue el mensaje de
`registrar_venta`, que ahora nombra también al balde).

- **El doble cobro.** Cada ticket lleva una clave al azar (`lib/claveUnica.ts`)
  que cambia con cualquier cambio del carrito o del medio de pago, y
  `registrar_venta` devuelve la venta que ya tiene esa clave en vez de crear
  otra. La unicidad es un índice único parcial (`una_venta_por_clave`), no un
  `select` previo. Con eso, volver a tocar Cobrar después de perder la respuesta
  es seguro, y el cartel dejó de decir "mirá Últimas ventas antes de cobrar".
- **El costo de los insumos se mueve hacia atrás: arreglado.** El costo unitario
  se escribe en cada movimiento del ledger (`movimientos_insumo.costo_unitario`)
  y el margen del Panel lo lee de ahí, no de `insumos.costo` de hoy. Las filas
  que ya existían se completan con el costo actual: es lo más cerca que se puede
  estar.
- **Separador de miles en todos los precios** (carrito, selectores, ticket,
  Historial, Inventario), con `useGrouping: "always"`: según la versión de ICU, el
  español no agrupa los de cuatro cifras. Era el pendiente chico del TPV.
- **Fase 8 — permisos por acción.** Tres permisos fijos que el dueño tilda por
  colaborador al crearlo o editarlo: anular ventas y corregir sabores, registrar
  gastos/ingresos/retiros de caja, y cargar mercadería/baldes/ajustes de stock.
  Cada función de Postgres que mueve plata o stock exige `tiene_permiso(...)`, y
  la pantalla esconde el botón (un contexto, `usePuede` / `SiPuede`, en vez de
  pasar `puedeX` por tres niveles). El default es tenerlos todos, así que aplicar
  la migración no le saca nada a nadie.
- **Fase 9 — ciclo del balde.** "Se terminó" (abierto → vacío, con un ajuste por lo
  que el sistema creía que sobraba), "Los entregué al proveedor" (vacío →
  canjeado, de a varios y todo o nada) y **balde entero en Ventas** (cerrado →
  vendido). El precio del balde entero es un default del comercio que cada sabor
  puede pisar. Anular esa venta devuelve el balde a la cámara. El Panel suma el
  envase del balde vendido al costo (el margen real) y muestra cuántos baldes
  salieron por cada puerta.
- **Fase 10 — Excel.** Tres descargas para el dueño: Inventario (5 hojas),
  Historial de ventas (con el filtro de la pantalla, pero TODAS las ventas, no
  las 100 que se ven) y Caja (turnos con su arqueo y todos los movimientos).
- 246 tests unitarios; `npm run verificar` y `npm run build` pasan.

### Qué se decidió

- **La clave de cobro cambia con el carrito.** Así la misma clave siempre es el
  mismo ticket: no se le puede devolver a un pedido distinto la venta de uno
  anterior. Y la base verifica que la clave sea de quien la manda.
- **Permisos: una lista fija de tres, no un editor de roles.** Son pocas acciones
  y se entienden de un vistazo; un editor genérico se puede configurar mal. Abrir
  un balde, vaciarlo y cerrar la caja quedan fuera: sin eso no se puede trabajar.
  Vaciar un balde lo puede hacer cualquiera aunque dé de baja kilos: se hace cada
  vez que un balde se acaba en el mostrador, y queda registrado quién fue.
- **Balde entero: solo uno cerrado, y no se elige cuál.** La base saca el más
  viejo (`for update skip locked`, así dos ventas a la vez no pelean por el mismo).
  Sin precio no se ofrece: mejor un botón con "Sin precio" que un error al cobrar.
  Corregir sabor no aplica a un balde entero; si se equivocaron, se anula.
- **Excel de verdad (.xlsx), no CSV.** Un CSV depende de la configuración regional
  de la compu (coma o punto y coma, coma o punto decimal) y Goro no tiene por qué
  saberlo. Con `write-excel-file` el archivo abre con doble clic, los números son
  números y las fechas fechas. Dependencia nueva: `write-excel-file` (y `fflate`
  de desarrollo, para leer el .xlsx en los tests).
- **Los Excel son solo del dueño**, y se arman desde su sesión: los nombres de
  quién hizo cada cosa y el arqueo son suyos por RLS, y una descarga no es la
  excusa para saltearla. La lectura va de a mil filas (`lib/paginar.ts`) y falla
  entera si una página falla: un archivo truncado que parece completo es peor que
  ninguno. Los textos cargados por personas pasan por el saneo de `=`, `+`, `-`, `@`.
- **El enlace de descarga es un `<a>`, no un `<Link>`:** Next precargaría la ruta
  y armaría el archivo cada vez que alguien pasa el mouse.

### Qué queda pendiente

1. Probar a mano (las migraciones ya están aplicadas y los tests de base pasan): cobrar, anular, vender un balde entero, sacarle un
   permiso a un colaborador, y bajar los tres Excel.
2. Abrir un Excel en la compu de Goro: lo único que no se puede comprobar desde
   acá es cómo lo muestra Excel (anchos, formatos de plata, hojas).
3. Del plan quedan la Fase 3 (etiquetas y códigos de barras, lo que Goro más
   quiere ver) y el escaneo en Ventas — y, antes que nada, la prueba física de la
   pistola y de la etiqueta en el freezer (0.2 y 0.3), que sigue sin hacerse.
4. **¿Hay algo más? (regla 1.8).** Lo que se vio y quedó como está, a propósito:
   - Un colaborador sin permiso de ajustes igual puede dar de baja los kilos que
     sobran al marcar "Se terminó". Es el caso diario del mostrador; queda el
     registro de quién fue.
   - El total que muestra el Historial es el de las filas que se ven (tope de
     100), y la pantalla lo avisa. El Excel de ventas trae todas.
   - Ocultar un botón no es una barrera: la barrera es `tiene_permiso` en la base,
     y los tests de `auth/permisos/` llaman a las funciones directamente.
   - `FormularioStockMinimoDefault` no se usa en ninguna pantalla desde antes: el
     mínimo por defecto no se puede editar desde la interfaz. No se tocó.

---

## 2026-10-01 (tercera parte) — Historial de ventas y Panel del dueño, con sus indicadores

### Qué se hizo

Primero se revisó el commit anterior (el carrito que vuelve vacío al cobrar) y
salieron tres arreglos; después, la Fase 6.

- **El aviso "Cobrado" dice lo que registró la base, no lo que sumaba el
  carrito.** El precio lo recalcula `registrar_venta`, así que si cambiaba
  mientras se armaba el ticket la pantalla mostraba un número distinto al que
  quedó en la venta y en la caja. La acción ahora devuelve el total registrado y
  el número de venta, que sirve para encontrar el ticket en Últimas ventas.
- **Mientras la venta viaja no se puede agregar nada** (un `fieldset`
  deshabilitado): al volver, el carrito se vacía, y lo que se hubiera agregado en
  el medio se perdía sin que quien cobra supiera si entró o no. Y si se pierde la
  respuesta, el carrito queda como está con un error que manda a mirar Últimas
  ventas antes de cobrar de nuevo: cobrar dos veces es peor que revisar.
- **Fase 6 — pantalla `/historial`:** rango de fechas y medio de pago, atajos
  Hoy / Esta semana / Este mes, y el resumen del filtro ("12 ventas · $148.000
  cobrado · 1 anulada"). Las filas son las mismas de Últimas ventas, así que se
  abre el ticket, se corrige un sabor y se anula sin código nuevo. Tope de 100
  filas, con el aviso de acotar el rango.
- **`src/lib/periodos.ts`:** el período (día, semana, mes o rango libre) y su
  traducción a los instantes que entiende la base. 21 tests.
- **"Últimas ventas" quedó en 5 filas** más un link al Historial: en el mostrador
  es el atajo para lo que recién se cobró, no un archivo.
- Renombres y una deduplicación: `FilaVentaReciente` → `FilaVenta` y
  `VentaReciente` → `VentaConTicket` (la misma fila ahora muestra una venta de
  hace un mes), y una sola lista de medios de pago (`MEDIOS_DE_PAGO`), que estaba
  repetida en tres lugares.
- **El Historial no necesitó migración:** `ventas` ya tenía `creado_en`,
  `medio_pago` y `estado`.
- **Fase 7 — el Panel vive en Inicio.** Para el dueño, `/inicio` pasó a mostrar
  lo vendido del período, las ventas por hora y los kilos por sabor; el
  colaborador ve tres atajos. Antes esa pantalla decía "todavía no hay módulos",
  que quedó viejo hace cinco fases.
- **Migración `20261001120000_panel.sql`**: un índice por `ventas (creado_en)` —que el Historial también
  usa— y tres funciones de lectura, `ventas_del_periodo`, `ventas_por_hora` y
  `kilos_por_sabor`.
- **El gráfico por hora es un SVG propio**, sin librería: barras en un
  `viewBox` con `preserveAspectRatio="none"` (son rectángulos, estirarlos no
  molesta) y los rótulos de la hora en HTML, para que no se estiren con él. La
  barra del pico va en `--destacado`.
- **El filtro de período subió a `componentes/FiltroDePeriodo.tsx`**, que ahora
  comparten el Historial y el Panel. Cada pantalla le agrega sus campos como
  `children`, dentro del mismo form: el Historial, el medio de pago.
- **Enzo aplicó la migración del Panel y los 80 tests de base pasaron** (7
  archivos), con los 4 del Panel corriendo por primera vez contra Supabase.
- **Cuatro indicadores más, a pedido de Enzo** (`20261001130000_panel_indicadores.sql`,
  que aplicó el mismo día): la comparación con el período anterior pegada a cada
  número, lo que rinde cada día de la semana, el margen bruto y el ranking de
  artículos. Tres funciones nuevas (`ventas_por_dia`, `unidades_por_articulo`,
  `costo_de_lo_vendido`) y el índice que faltaba en
  `movimientos_balde (venta_item_id)`, por donde joinean dos de ellas.
- **`nombreItem.ts` se mudó a `lib/`**: el ranking de artículos necesita el mismo
  nombre que ve el cajero en el carrito, y ahora lo usan dos módulos. La base
  devuelve los pedazos del nombre justamente para no armarlo también en SQL.
- 184 tests unitarios; `npm run verificar` y `npm run build` pasan.

### Qué se decidió

- **El Historial no es el Panel.** Los reportes por día, semana y mes son la Fase
  7: el Historial busca UNA venta y necesita filas con su ticket; el Panel mide
  el conjunto y necesita sumas, que las va a hacer Postgres y no el navegador.
  Por eso el período vive en `lib/periodos.ts` y no en el módulo de ventas: el
  Panel y el Excel lo van a pedir igual.
- **El filtro vive en la URL, no en estado.** Así "las transferencias de la
  semana" es un link que Goro puede guardar, el botón Atrás funciona y la
  pantalla se sigue armando en el servidor: un `<form method="get">` sin una
  línea de JavaScript.
- **El desfasaje horario se mide, no se escribe.** Un día del local arranca a las
  03:00 UTC, pero `-03:00` no está hardcodeado: se calcula contra la zona. Si
  Argentina vuelve a mover la hora, que no se entere por un cierre que no cuadra.
- **Los permisos quedan como estaban:** cualquiera con sesión ve el historial y
  puede anular. Restringirlo hoy pedía una migración de RLS, y los permisos por
  acción ya son la Fase 8.
- **Las tres funciones del Panel son `stable` y `security invoker`, no
  `definer`:** así cada una ve exactamente lo que la RLS le deja ver a quien
  llama, sin un `if` de rol que haya que mantener en paralelo con las políticas.
  Esconder el Panel del colaborador es comodidad, no una barrera: ya ve cada
  venta en el Historial y podría sumar lo mismo contra la API. La única plata
  que la base le oculta de verdad sigue siendo el arqueo.
- **El ranking de sabores va en kilos, no en plata.** Es lo que sirve para
  comprar. Repartir el precio del pote entre sus sabores daría un número
  inventado: el precio no depende del sabor.
- **La zona horaria entra por parámetro a `ventas_por_hora`.** Si estuviera
  escrita dentro del SQL habría dos lugares que la definen, y un gráfico corrido
  tres horas manda personal al turno equivocado.
- **El período anterior son los mismos N días, inmediatamente antes**, y la
  pantalla muestra con qué fechas compara. Es la única regla que da lo mismo para
  un día, una semana o un rango libre. Se descartó "el mismo tramo de la semana
  pasada": más fiel para la semana, pero indefinible para un rango cualquiera.
- **El margen es bruto y lo dice.** Lo cobrado menos lo que costó lo que salió;
  no descuenta sueldos, alquiler ni los gastos de caja, que viven en Caja.
  Mezclarlos daría un número que no es ni una cosa ni la otra.
- **El helado se valúa al costo del balde del que salió**, no a un promedio: dos
  baldes del mismo sabor pueden haber costado distinto. Eso hace que una
  corrección de sabor se recalcule sola, y su test lo fija con dos baldes de
  $100 y $200 el kilo.
- **El `costo_envase` del balde no entra en el margen:** el balde vuelve al
  proveedor, y recién cuesta un envase el día que se vende en vez de canjearse
  (Fase 9). El test le pone $90.000 al envase para que se note si entrara.

Las dos migraciones del Panel están aplicadas y Enzo lo probó en pantalla: anda.
**`npm run test:rls` pasa entero: 83 tests en 7 archivos** contra Supabase, con
los siete casos del Panel corriendo contra la base de verdad.

Del plan quedan la Fase 3 (etiquetas y códigos de barras, que es lo que Goro más
quiere ver), el balde entero y el escaneo en Ventas, los permisos por acción, el
ciclo del balde y el Excel. Y los dos pendientes chicos del TPV anotados en el
roadmap: el total del carrito sin separador de miles y el doble cobro por doble
clic.

---

## 2026-10-01 (segunda parte) — Usuarios: alta, edición y baja desde la pantalla

### Qué se hizo

Primero se cerró Caja: Enzo aplicó la migración y probó a mano, y los 66 tests de
base pasaron contra Supabase. Después, a pedido de Enzo, la pantalla de Usuarios
dejó de ser una lista de solo lectura.

- **Migración `20261001110000_usuarios.sql`** (escrita y probada en local con 31
  escenarios; Enzo la aplicó en Supabase): un trigger que protege los perfiles, otro que
  copia el usuario al perfil cuando se renombra la cuenta en Auth, y la función
  `perfil_tiene_historial`. `perfiles.usuario` deja de ser editable directo.
- **Pantalla `/usuarios`:** nuevo usuario, editar (nombre, usuario de ingreso,
  rol), cambiar la contraseña, activar / desactivar y borrar.
- **`src/lib/supabase/servicio.ts`:** por primera vez la clave de servicio entra
  al código del servidor, detrás de `server-only`.
- **Se arregló un bucle de redirecciones** que ya existía: un usuario desactivado
  con sesión rebotaba para siempre entre `/ingresar` y `/inicio`.
- **Se arregló "Salir" desde una pestaña con la sesión muerta**, que Enzo encontró
  probando: tiraba "An unexpected response was received from the server". El
  proxy redirigía con un 307 el POST de la acción, el navegador repetía ese POST
  contra `/ingresar`, y la respuesta no era la de una acción. También venía de
  antes, pero borrar usuarios desde la pantalla lo dejó a la mano. Ahora el proxy
  solo redirige navegaciones (`lib/destinoProxy.ts`, con sus tests); las acciones
  pasan y verifican la sesión ellas mismas, como ya hacían.
- **En Ventas, el carrito vuelve vacío solo al cobrar.** Antes había que tocar
  "Nueva venta" para salir del panel "¡Listo!"; ahora queda el carrito listo para
  el próximo cliente con una línea "Cobrado: $X · Efectivo" que se va al agregar
  el primer ítem. Se sacó `TicketConfirmado`. El carrito se vacía al terminar la
  acción y ya no comparando estados durante el render.
- 23 tests unitarios nuevos y `auth/rls.test.ts`. `npm run verificar` y
  `npm run build` pasan.

### Qué se decidió

- **"Borrar" hace una de dos cosas y dice cuál:** sin historial se borra de
  verdad; con ventas o movimientos, se desactiva. Se mantiene lo que ya decía la
  migración del núcleo (lo que alguien vendió sigue a su nombre) y se le suma que
  un usuario creado por error pueda desaparecer.
- **La clave de servicio se usa solo para la cuenta de Auth.** Nombre, rol y
  activo se editan con la sesión del dueño, así siguen pasando por la RLS y los
  triggers. Se descartó hacer todo con la clave de servicio: dejaba la seguridad
  entera en un `if`.
- **Las reglas duras van en la base:** siempre queda un dueño activo, y nadie se
  cambia el rol ni se desactiva a sí mismo. Valen también desde el panel de
  Supabase.
- **Renombrar es una sola escritura:** se cambia el correo de Auth y un trigger
  copia el usuario al perfil. No hay dos lugares que puedan desfasarse.
- **`perfil_tiene_historial` ensaya el borrado y lo deshace**, en vez de llevar
  una lista de tablas que quedaría vieja con la primera tabla nueva.
- **La contraseña la pone el dueño**, con un "Mostrar" para ver lo que tipea: se
  la tiene que decir a otra persona. Mínimo 8 caracteres.
- **Un desactivado que intenta entrar ve "usuario o contraseña incorrectos"**, el
  mismo mensaje de siempre.
- **Fuera de alcance:** los permisos por acción ("sacarle a Ana el permiso de
  anular"). Siguen siendo la Fase 8.

### La pregunta de la regla 1.8: ¿hay algún punto débil?

1. **Las acciones que usan la clave de servicio no tienen test automático.** Toda
   su seguridad es `duenioQuePide()`. Los tests de base cubren lo que hay debajo
   (RLS y triggers), no la acción.
2. **Cambiar la contraseña no cierra las sesiones ya abiertas** de ese usuario.
   Para sacar a alguien del sistema hay que desactivarlo, no cambiarle la clave.
3. **Desactivar no revoca el token de Auth.** Sigue vivo hasta que vence, pero sin
   perfil activo la base no le devuelve nada y la app le cierra la sesión.
4. **"Siempre queda un dueño" no se probó contra Supabase:** exigiría desactivar a
   los dueños reales. Está probado en local.
5. **`/salir` responde a un GET:** un enlace malicioso puede cerrarle la sesión a
   alguien. Es una molestia, no una fuga.
6. **Crear un dueño son dos pasos** (crear y promover). Si falla el segundo, queda
   como colaborador y la pantalla lo avisa.
7. **No queda registro de quién cambió a qué usuario.**
8. **La clave de servicio ahora vive en el hosting.** Si se filtra, es acceso total
   a la base.

### Qué queda pendiente

- Cargar `SUPABASE_SERVICE_ROLE_KEY` el día que haya hosting; todavía no se
  desplegó nada, y en local ya está.
- Probar a mano como dueño: crear un colaborador, entrar con él, renombrarlo,
  cambiarle la contraseña, desactivarlo (y ver que no entra), borrar uno sin
  historial y "borrar" uno con ventas.
- Lo que ya venía: la vista del colaborador en Caja, precios y envases que
  completa Goro, baldes de 10 L y 5 L, los menores, staging y la guía para Goro.

---

## 2026-10-01 — Caja: turnos, libro de efectivo y arqueo ciego

### Qué se hizo

La Fase 5 del roadmap, de punta a punta. La migración se escribió y se probó en
local; Enzo la aplicó en Supabase y probó el circuito a mano el mismo día.

- **Migración `20261001100000_caja.sql`:** `turnos_caja`, `movimientos_caja` (el
  libro) y `arqueos`; `ventas.turno_id`; las funciones `abrir_caja`,
  `registrar_movimiento_caja`, `anular_movimiento_caja` y `cerrar_caja`; y
  `registrar_venta` / `anular_venta` reemplazadas para que escriban en la caja
  dentro de su misma transacción.
- **Pantalla `/caja`:** abrir, cargar ingreso / gasto / retiro, anular uno mal
  cargado, cerrar. El dueño ve además el resumen del turno, las ventas por medio
  de pago, y el historial de turnos con su arqueo (`/caja/turno/[id]` abre uno).
- **Insignia "Caja abierta / cerrada"** en la barra lateral, en todas las pantallas.
- **Ventas:** con la caja cerrada avisa arriba y no deja cobrar; si la caja se
  cierra mientras se arma un ticket, ofrece abrirla sin perder el carrito.
- **Tests:** 13 unitarios nuevos (resumen del turno, texto de la diferencia,
  historial, formato de plata, horas en la zona del local) y `caja/rls.test.ts`.
  Los tests de base de Ventas ahora abren una caja de prueba.
- `npm run verificar` y `npm run build` pasan. La migración pasó 57 escenarios en
  un Postgres local (PGlite) antes de escribir una línea de pantalla.
- **Con la migración ya aplicada, `npm run test:rls` pasa entero: 66 tests en 5
  archivos**, contra Supabase. Incluye las dos aperturas simultáneas (gana una
  sola) y que el esperado que congela la base es el mismo que calcula la pantalla.

### Qué se decidió

- **Sin caja abierta no se cobra.** Cada venta pertenece a un turno.
- **Arqueo ciego, y apertura también ciega.** El colaborador ve los movimientos
  pero no totales, ni el esperado, ni la diferencia; al abrir tampoco se le
  sugiere el fondo que dejó el cierre anterior, porque una sugerencia se confirma
  sin contar. `arqueos` solo la lee el dueño (RLS).
- **Libro de caja en vez de caja derivada:** cada peso es una fila y el esperado
  es una suma sobre una sola tabla. La apertura también es un movimiento.
- **El turno es del local, no de la persona.** Un solo cajón.
- **Anular una venta en efectivo saca la plata del turno abierto ahora**, aunque
  la venta sea de un turno anterior. Sin caja abierta no se anula; con tarjeta o
  transferencia, sí.
- **Los tres movimientos a mano (ingreso, gasto, retiro) los cargan los dos
  roles:** si Goro se lleva plata con Ana logueada, Ana tiene que poder anotarlo.
- **Se descartó `check (turno_id is not null) not valid`** sobre `ventas`, que
  estaba en el diseño: Postgres lo reevalúa en cada `update` y anular una venta
  vieja fallaba. La garantía es que `registrar_venta` es la única puerta.
- **Por medio de pago:** en Caja, el dueño ve y filtra las ventas del turno por
  efectivo / tarjeta / transferencia. Las consultas por rango de fechas van al
  Historial (Fase 6), ya anotado en el roadmap; el modelo no cambia.
- **Los modales de Caja no se cierran con clic afuera** (`Modal` tiene ahora
  `cerrarConClicAfuera`). Los demás modales siguen como estaban.
- **Las horas se muestran en la zona del local** (`ZONA_HORARIA` en
  `config/comercio.ts`), no en la del servidor.
- Los tests de base corren **de a un archivo** (`npm run test:rls`): "una sola
  caja abierta" vale para toda la base. `caja/rls.test.ts` **se niega a correr si
  encuentra una caja abierta.**

### La pregunta de la regla 1.8: ¿hay algún punto débil?

Sí, y conviene tenerlos a la vista:

1. **Una venta que entra justo mientras se cierra la caja no tiene test.** El
   candado está (`for share` en la venta, `for update` en el cierre) y la
   apertura simultánea sí se probó contra Supabase, pero ese cruce puntual solo
   está razonado, no ejercitado.
2. **El arqueo ciego se puede burlar sumando.** El colaborador lee las ventas y
   los movimientos (por pantalla y por API) y puede calcular el esperado. El
   sistema no se lo sirve; impedirlo exigiría esconderle sus propias ventas.
3. **Cualquier sesión puede cerrar la caja y anular un movimiento ajeno.** Queda
   quién y cuándo, pero no hay permiso que lo impida hasta la Fase 8.
4. **Un arqueo mal tipeado no se corrige.** Si quien cierra escribe 4.200 en vez
   de 42.000, queda una diferencia falsa para siempre, sin nota que la explique.
5. **Nada obliga a cerrar la caja.** Un turno puede quedar abierto varios días;
   solo se ve la fecha de apertura.
6. **Staging dejó de ser deseable y pasó a ser condición.** Los tests de base
   corren contra el mismo proyecto que va a usar Goro; los de Ventas escribirían
   ventas de prueba en su turno real.
7. **Las ventas de prueba anteriores a Caja no tienen turno.** Anular una en
   efectivo resta del turno abierto plata que nunca entró a ningún turno.

### Qué queda pendiente

- Si la prueba a mano fue solo como dueño: entrar como colaborador y confirmar
  que no ve totales, ni el esperado, ni la diferencia al cerrar.
- Lo que ya venía: precios y envases que completa Goro, la venta mezclada a
  mano, baldes de 10 L y 5 L, los menores (formato a $0, mensaje al borrar un
  insumo), staging y la guía para Goro.
- La pantalla de Inicio sigue diciendo "Todavía no hay módulos".

---

## 2026-09-29 — Productos, envases y migraciones renovadas

### Qué se hizo

Goro mandó dos listas: productos de freezer que se venden por unidad y por docena
(bombón, palito, sándwich, cono bañado, cremita, vasito de 100 g) y los formatos
del mostrador con y sin helado (cucurucho simple/doble/dulce, canasta, vasito
simple, cucuruchón dulce). Se construyó en dos vueltas:

- **Primera vuelta:** presentaciones (unidad, docena) con precio propio, cono
  descontado al vender, venta y anulación de productos, carga inicial.
- **Rediseño tras probarlo en pantalla** (Enzo encontró redundancia, mezcla de
  conceptos y campos sin título):
  - `insumos.tipo`: **insumo** (se consume), **producto** (freezer, se vende por
    unidad o docena) y **envase** (el stock propio de un formato: su cono,
    canasta o vasito, atado a UN formato).
  - Stock tiene tres pestañas: Sabores · Insumos · **Productos**. Los envases no
    aparecen ahí: se manejan desde su formato, con su stock, su costo y su precio
    "sin helado" (×1 y ×12). Un pote no lleva envase.
  - Todos los campos llevan título y las presentaciones dicen "Docena ×12". El
    **costo por unidad** (lo que paga Goro) y el **precio de venta** están en
    lugares distintos, rotulados, para que no se confundan.
- **Las migraciones se renovaron por completo:** de trece archivos apilados a
  cinco, uno por módulo (núcleo, catálogo, inventario, productos, ventas), con
  todos los arreglos ya integrados. Hay un script para reiniciar la base
  (`supabase/reiniciar_base.sql`) y los pasos en `supabase/README.md`.
- **Ajustes tras probar en pantalla:** el dueño puede borrar una presentación que
  nunca se vendió (migración `20260930150000`); los casilleros numéricos se
  seleccionan al enfocarlos, así el 0 se pisa en vez de quedar "05000"; más aire
  entre los títulos de los campos; y la etiqueta no repite la cantidad cuando el
  nombre ya la dice ("Decena x10", no "Decena x10 ×10").
- **Bug de React en los modales de carga** (`ModalCargarInsumo` y
  `ModalReponerBalde`): le cambiaban el estado al padre durante el render, y la
  segunda carga exitosa no los cerraba. Ahora cierran al terminar la acción.

### Qué se decidió

- **"Sin helado" es vender el envase como producto** con su propio precio: no
  hay una columna `precio_sin_helado`.
- **El envase cuelga del formato** (`insumos.formato_id`, único): "un formato,
  un envase" lo garantiza un índice, y la tabla `formato_insumos` del primer
  diseño desapareció.
- **El stock de un insumo puede quedar negativo:** no se bloquea una venta por un
  conteo mal llevado; se avisa con "Negativo: recontar".
- **El vasito de 100 g entra por unidades**, así que el helado que lleva no se
  descuenta de ningún balde. Costo aceptado: el stock de sabores queda
  sobreestimado hasta la fase de armado de potes con peso real.
- **Se rompió a propósito la regla "no editar migraciones aplicadas"** porque el
  sistema todavía no tiene datos reales; vuelve a valer desde ahora.
- La revisión final había encontrado dos huecos de seguridad (`aplicar_movimiento_balde`
  ejecutable por cualquier empleado, y `registrar_movimiento_insumo` aceptando
  movimientos de venta). Ya nacen cerrados en el esquema nuevo.
- Las migraciones nuevas se probaron **antes** de aplicarlas, en un Postgres
  local (PGlite): la cadena vieja y la nueva dan el mismo catálogo salvo el
  rediseño, y 35 escenarios de venta, anulación y permisos pasan.
- **Los `rls.test.ts` no habían corrido nunca en este proyecto.** Se arreglaron:
  entorno `node` (en jsdom el cliente de servicio heredaba la sesión de un usuario
  de prueba), usuarios de prueba únicos y limpieza aunque un test falle.

### Qué queda pendiente

- **Goro completa** precios de venta y costos, y confirma que los seis formatos
  llevan envase (¿el cucurucho simple y el doble comparten cono?).
- Probar a mano en pantalla una venta mezclada (formato con envase + docena) y
  su anulación.
- Baldes de 10 L y 5 L: hoy el balde solo guarda `kg_inicial`.
- Menores sin resolver: un formato se puede activar a $0; el mensaje al borrar un
  insumo con presentaciones dice "ya tiene movimientos"; posible cruce de candados
  entre tickets simultáneos (raro con un local).

---

## 2026-09-21 (segunda parte) — El método se unifica

### Qué se hizo

Los dos contratos de arranque de `_metodo/` compartían unas 200 líneas casi
literales. Se partieron en un núcleo compartido (`reglas.md`) más dos deltas
cortos. En este repo cambian tres punteros:

- `AGENTS.md` y `README.md` → `../_metodo/reglas.md`
- `ROADMAP.md` → `../_metodo/reglas.md` y `../_metodo/prompt-base-web.md`

### Qué se decidió

**Las cuatro reglas de base de este proyecto ahora son ocho, y están en un solo
lugar.** El `AGENTS.md` de acá tenía como regla 1 *"una operación de negocio =
una transacción del lado del servidor"*, y esa regla **no estaba en el contrato
web** — solo en el del producto instalable. Vivía en el documento equivocado. Al
unificar quedó en `reglas.md §1.5`, con la nota de dónde venía.

Eso es el argumento de por qué se unificó: con el mismo contenido en dos
lugares, las reglas se separan solas y nadie se entera.

### Qué queda pendiente

Sin cambios respecto de la entrada anterior: staging y guía para Goro. El
roadmap sigue igual.

---

## 2026-09-21 — El método sale de las carpetas de clientes

### Qué se hizo

Sesión de ordenamiento de `proyectos/`, no de código de Goro. Lo que toca a
este repo son tres archivos: `AGENTS.md`, `README.md` y `ROADMAP.md`, donde se
actualizaron los seis enlaces relativos a los documentos de método, que se
movieron a `_metodo/`.

- `../lecciones-ciro-polirrubro.md` → `../_metodo/lecciones-ciro-polirrubro.md`
- `../bitacora-disenos.md` → `../_metodo/bitacora-disenos.md`
- `../sistema de gestion/prompt-base-sistemas-gestion.md` →
  `../_metodo/prompt-base-sistemas-gestion.md`

El contenido no cambió, solo la ruta. Verificado con `git diff`: seis líneas.

### Qué se decidió

**Se creó esta bitácora.** Goro era el proyecto más activo sin memoria de
sesión: tenía `ROADMAP.md` (qué falta) pero nada que dijera cómo se llegó. En un
proyecto documental como cartelería el estado se lee en los documentos mismos;
en uno de código como este, sin bitácora el estado solo existe en la cabeza de
quien lo escribió y en un historial de chat que se pierde al cambiar de
terminal.

**Los archivos de método no se renombraron.** La idea original era pasar
`lecciones-ciro-polirrubro.md` a `lecciones-seguridad.md`, más descriptivo.
Se descartó: los documentos se referencian entre sí por nombre y renombrar
multiplicaba los enlaces a arreglar sin mejorar nada real.

### Dónde está el sistema hoy

Núcleo aplicado (ingreso por usuario, roles, RLS, menú por rol). Inventario
—sabores, insumos, baldes— aplicado, y el módulo de Stock rehecho parecido al
mockup: tablas únicas con buscador, insignia global, modales de Reponer y
Cargar, columna de balde abierto y densidad de filas. Catálogo de formatos y
Ventas (cobrar a dedo) aplicados. El generador de códigos de barras
(`src/lib/codigos/`) es el paso 0.1 y está.

### Qué queda pendiente

Seguir con el roadmap. Dos cosas que este ordenamiento dejó anotadas y no se
resolvieron acá: **Goro no tiene staging** (ningún proyecto lo tiene) y las
migraciones se aplican directo; y falta la **guía para Goro** —el sistema tiene
tests y RLS pero nada escrito para quien lo va a usar en el mostrador.
