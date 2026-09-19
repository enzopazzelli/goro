# Roadmap — Goro, versión real

Documento vivo. Acá está el plan para pasar del mockup que se muestra en la
reunión (`index.html`) al sistema que Goro va a usar un sábado a la tarde con
el local lleno.

Se apoya en dos documentos que ya existen y no se rediscuten acá:

- `../sistema de gestion/prompt-base-sistemas-gestion.md` — cómo se arma un
  sistema de gestión por módulos, qué va en el núcleo y qué se cotiza aparte.
- `../lecciones-ciro-polirrubro.md` — los seis errores reales que aparecieron
  en el proyecto anterior. Se repasan **antes** de escribir cada función, no
  después.

---

## 0. Dónde estamos hoy

|                                | Estado                                                                                                          |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Mockup de venta (`index.html`) | Listo y congelado. Sirve para vender el proyecto, no para crecer. No se le agrega nada más.                     |
| Sistema real                   | Núcleo aplicado: ingreso por usuario, roles, RLS, menú por rol. Inventario (sabores, insumos, baldes) escrito, falta aplicar la migración. |
| Stack                          | Next.js App Router + Supabase (Postgres, Auth, RLS). Un módulo por carpeta, tokens de color en un solo archivo. |
| Hardware confirmado            | Pistola lectora (Goro la tiene). Balanza simple: **pesa y muestra, no imprime**.                                |
| Hardware sin decidir           | Impresora de etiquetas. Impresora de tickets.                                                                   |
| Alcance                        | **Un solo local**, ni ahora ni previsto a futuro. Decidido: el modelo de datos no lleva sucursal.               |
| Códigos de proveedor           | **No hay.** Lo que llega del proveedor viene sin etiquetar. Todo código lo genera el sistema.                   |
| Módulos pedidos                | Inventario, Ventas, Caja, Historial, Usuarios, Panel — más el generador de códigos.                             |
| Fuera de alcance               | **Clientes / cuenta corriente**: Goro no lo pidió. Puede aparecer más adelante, así que no se cierra la puerta. |

---

## 1. El pedido de Goro, traducido

> "Por cada producto que creo en mi inventario quiero generar un código de
> barras para imprimir, y que después mi pistola pueda leerlo."

El pedido es claro, pero esconde una trampa del rubro: **en una heladería
"producto" son tres cosas distintas**, y no todas llevan código propio.

| Qué es                                                             | ¿Lleva código?                                 | Quién lo genera                      | Para qué sirve leerlo                                                              |
| ------------------------------------------------------------------ | ---------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------- |
| **Pote armado** que va al freezer de autoservicio (1/4, 1/2, 1 kg) | Sí, **uno por pote físico**                    | El sistema, al armarlo               | Cobrar en un segundo, con el peso y el precio ya congelados en la etiqueta         |
| **Balde** de helado                                                | Sí, **uno por balde físico**                   | El sistema, cuando el balde entra    | Saber cuál se está usando en el mostrador, cuál está entero para vender, y cuál se fue en canje |
| **Insumo comprado** (cucuruchos, potes vacíos, salsas)             | Sí, **uno por tipo de insumo** — no por unidad | El sistema, al dar de alta el insumo | Recibir el pedido del proveedor sin buscar el ítem a mano en una lista de cuarenta |

Nada de lo que entra al local viene etiquetado de fábrica: **el proveedor de
Goro no pone códigos**. Eso, contra lo que parece, simplifica el módulo — no
hay que importar códigos ajenos, ni convivir con dos formatos, ni resolver qué
pasa cuando dos proveedores repiten un EAN. Un solo generador, un solo formato,
todo bajo control de Goro.

Lo que sí hay son **dos naturalezas de código**, y confundirlas es el error
caro del módulo:

|                            | Código de **artículo**                                                                                                 | Código de **unidad**                                            |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Qué identifica             | Un _tipo_ de cosa: "Cucuruchos"                                                                                        | Un objeto físico: _este_ pote                                   |
| Cuántos existen            | Uno solo, y dura para siempre                                                                                          | Uno por objeto, y se consume al venderlo                        |
| Se aplica a                | Insumos                                                                                                                | Potes armados, baldes, bachadas                                 |
| Dónde vive                 | Pegado en el estante donde para el insumo, y en una hoja de códigos plastificada colgada donde se recibe la mercadería | En el objeto mismo                                              |
| Qué contesta al escanearlo | "Esto es Cucuruchos" → y ahora decime cuántos entran o salen                                                           | "Esto es _este_ pote: frutilla, 262 g, $6.500, lote del martes" |

El insumo **no lleva una etiqueta por unidad**: nadie le va a pegar un código
a cada cucurucho de una caja de mil. Lleva una etiqueta de estante y figura en
la hoja de códigos. Eso es lo que convierte "recibir el pedido del proveedor"
en escanear y tipear una cantidad, en vez de buscar cuarenta ítems en una
lista con las manos ocupadas.

Los tres casos se resuelven con **un solo módulo y un solo generador**. Dos
tablas atrás, porque las dos naturalezas tienen ciclos de vida distintos, pero
un solo punto de entrada para el lector.

La consecuencia importante para el presupuesto y para el orden de las fases:
un pote de 1/4 no pesa siempre 250 g. Pesa 238, o 262. Con una balanza que
solo muestra el peso, **el peso real de cada pote lo tiene que capturar el
sistema en el momento de armarlo**, y ese número tiene que viajar hasta el
mostrador. Ese viaje es todo el módulo.

---

## 2. La decisión de fondo: qué guarda el código

Hay dos formas de hacer esto y la diferencia no es cosmética.

### Camino A — el código lleva los datos adentro

Es lo que hacen las balanzas etiquetadoras de supermercado: un EAN-13 que
arranca con `2` (prefijo reservado para uso interno del comercio) y trae el
precio o el peso codificado en los propios dígitos.

- A favor: funciona sin base de datos. Cualquier lector lo entiende.
- En contra: el código **no identifica al pote**, identifica a un precio. No
  hay trazabilidad, no se sabe qué se imprimió y nunca se vendió, y el día que
  cambia la lista de precios **todas las etiquetas impresas mienten**.

### Camino B — el código es una identidad, los datos están en la base ← **recomendado**

Cada etiqueta impresa es una fila en la base: sabor, peso real, precio
congelado al momento de imprimir, lote, fecha, y estado (`impresa` →
`vendida` / `anulada` / `descartada`).

- A favor: trazabilidad real. Sirve igual para los tres casos de la tabla de
  arriba. Goro puede ver **merma de verdad**: "estos 4 potes de frambuesa se
  imprimieron hace seis días y siguen sin venderse". Un pote no se puede
  cobrar dos veces. Y cambiar precios no rompe nada impreso.
- En contra: el mostrador necesita los datos disponibles. Se resuelve con el
  catálogo cacheado en el dispositivo (mismo patrón offline-first que
  `ciro-polirrubro`), no es un problema abierto.

**Regla que se deriva de esto y que no se negocia**: el código de barras no
transporta información, transporta una identidad. Todo lo demás vive en la
base. Es lo que permite que el mismo lector, la misma pantalla y la misma
tabla sirvan para un pote, una bachada y un cucurucho comprado.

### Formato propuesto

Code 128, corto y legible también a ojo debajo de las barras:

```
G P 000123 4
│ │ │      └─ dígito verificador (evita que un código mal tipeado a mano entre)
│ │ └──────── secuencia
│ └────────── tipo: A = artículo (insumo) · P = pote · B = balde · C = bachada
└──────────── prefijo del comercio
```

La letra del tipo hace doble trabajo: separa las dos naturalezas de código de
un vistazo, y garantiza que un código de artículo y uno de unidad nunca puedan
chocar aunque se generen en tablas distintas.

Code 128 porque es alfanumérico, denso y toda pistola moderna lo lee.
**Pero eso hay que verificarlo con la pistola de Goro, no darlo por hecho**
(Fase 0). Si esa pistola puntual solo leyera EAN-13, se cambia el generador
por un EAN-13 con prefijo `2` usado como identidad pura — sin precio adentro.
El modelo de datos del Camino B no se toca. Esa es justamente la ventaja de
que el código no lleve datos.

---

## 3. El balde es la unidad de inventario, no el sabor

Esta es la corrección más grande contra el mockup, y hay que hacerla antes de
escribir la tabla de inventario.

El mockup modela una cubeta por sabor, con sus kilos. Es mentira: **de Frutilla
puede haber tres baldes a la vez** — uno abierto en el pozzetti, del que se
sirven cucuruchos, y dos enteros en la cámara esperando. De esos dos, uno puede
irse vendido entero y el otro terminar reemplazando al del mostrador.

Si el inventario guarda "Frutilla: 8,4 kg", esa realidad no entra. Hay que
guardar **un balde por balde**, cada uno con su identidad, su código y su
estado:

| Estado      | Qué significa                                                        |
| ----------- | -------------------------------------------------------------------- |
| `cerrado`   | Entero, en la cámara. Se puede vender así o abrir.                   |
| `abierto`   | Es el que está en el mostrador. Se le descuentan kilos por cada helado. |
| `vendido`   | Se fue entero, con envase y todo.                                    |
| `vacio`     | Se terminó sirviendo. Espera el canje.                               |
| `canjeado`  | Volvió al proveedor a cambio de uno nuevo.                           |

"Frutilla tiene 8,4 kg" pasa a ser una **suma derivada** de los baldes de
frutilla que están `cerrado` o `abierto`, no un número que se pisa. Es la misma
regla de siempre —el stock no se sobrescribe, se suma un movimiento— pero
aplicada un nivel más abajo.

Dos consecuencias que ya se pueden dejar resueltas:

1. **Solo puede haber un balde `abierto` por sabor** (o el número que Goro
   diga). Eso es un invariante de "solo uno", así que va en un **índice único
   parcial**, nunca en un `select` previo que chequea antes de insertar.
2. **Que haya tres baldes de Frutilla no genera ningún conflicto de códigos**,
   justamente porque el código identifica al balde y no al sabor. Es la misma
   razón por la que dos potes de 1/4 de frutilla tienen códigos distintos. Si
   el código identificara al sabor, este caso sería imposible de representar.

### El ciclo del balde

Goro compra baldes y, cuando compra, **entrega el vacío que tenía y le dan
otro**. Pero si vende el balde entero, **el cliente se queda con el envase** y
Goro tiene que comprar uno para reponer.

```
compra → cerrado → abierto → vacio → canjeado → (vuelve otro balde lleno)
              └──────────────────→ vendido  (el envase se va con el cliente)
```

Un balde no muere cuando se vacía: sale del circuito por una de dos puertas, y
**las dos puertas cuestan distinto**. En el canje el envase vuelve y no se
paga. En la venta el envase se va, y reponerlo es plata que sale.

Eso tiene una consecuencia que conviene tener escrita desde ahora: **vender un
balde entero deja menos margen del que parece**, porque al helado hay que
sumarle el envase perdido. Si el sistema guarda el costo del envase, el panel
puede mostrar el margen real en vez del aparente. Es exactamente el tipo de
número que hoy nadie calcula y que justifica tener el sistema.

Y es lo que hace que el balde necesite identidad propia en vez de un contador:
hay que poder decir **cuál** balde se fue, cuándo, y por qué puerta.

---

## 4. Formatos y precios: catálogo, no código

### Los formatos son datos

Cucurucho, doble, vasito, 1/4, 1/2, kilo, balde. En el mockup están escritos en
el código porque es un mockup. En el sistema van en una tabla, y Goro los crea
desde una pantalla:

```
formatos
  id
  nombre           "1 kilo", "Pote 2 kg"
  gramos           1000
  cantidad_sabores 4          -- cuántos entran; el mostrador lo usa para el cupo
  precio           21000
  activo           boolean
```

Más una relación con los insumos que consume (un kilo se lleva un pote de 1 kg
y seis cucharitas), porque vender tiene que descontar eso también.

Así, el día que Goro compre un envase nuevo donde entran seis sabores y pesa
dos kilos, **no hay que tocar nada**: lo carga como un formato más, le pone
precio y aparece en el mostrador esa misma tarde.

Dos cosas que hay que hacer bien desde el principio:

- **Un formato no se borra, se desactiva.** Si hay ventas viejas que lo
  referencian, borrarlo rompe el historial. Mismo criterio que los usuarios.
- **El precio se congela en la venta.** La línea de venta guarda el precio que
  se cobró, no una referencia al precio de hoy. Si en marzo el kilo valía
  $21.000 y en junio $24.000, la venta de marzo tiene que seguir diciendo
  $21.000 para siempre. Es la misma regla que ya vale para la etiqueta de un
  pote.

Esa segunda regla es la que hace que **cualquier cambio futuro de precios sea
aditivo**: mientras cada línea guarde lo que cobró, se pueden agregar reglas
nuevas sin romper ni migrar una sola venta vieja.

### El precio del mostrador no depende del sabor

Un kilo vale lo mismo lleve los sabores que lleve. O sea: el precio vive en el
formato, y listo. Es lo que hace que armar un helado sea tocar sabores sin
mirar precios.

Vale dejar anotado que eso **no** quiere decir que todos los sabores cuesten
igual: en el mockup el pistacho sale $7.200 el kilo de costo y la vainilla
$3.900. Mismo precio de venta, márgenes muy distintos. No cambia nada del
modelo, pero es un número que el panel debería mostrar algún día — vender mucho
pistacho no es lo mismo que vender mucha vainilla, y hoy eso no lo ve nadie.

_Pregunta para Goro:_ ¿existen sabores premium que se cobran más caro? Hoy la
respuesta es no. Si algún día es sí, se agrega un recargo por sabor y las
ventas viejas no se enteran, gracias a la regla del precio congelado.

### El precio del balde sí puede depender del sabor

Acá Goro quiere las dos cosas: poder poner el mismo precio a todos, o uno
distinto por sabor. Se resuelve con **un valor por defecto del comercio y un
override por producto**:

```
sabores.precio_balde   nullable   -- null = usar el precio por defecto
```

Todos en `null` y todos los baldes valen igual. Se le completa a Pistacho y
solo Pistacho cambia. Sin pantallas distintas, sin modos, sin duplicar nada.

### El mismo patrón sirve para el mínimo

Goro ya pidió algo con la misma forma: que Frutilla avise antes que el resto.
Es el mismo mecanismo — un valor por defecto y un override por sabor:

```
sabores.stock_minimo   nullable   -- null = usar el mínimo por defecto
```

Conviene construirlo **una sola vez, como patrón**, y no como dos features
parecidas: "valor del comercio que un producto puede pisar". Cuando aparezca el
tercer caso —y va a aparecer— ya está resuelto.

---

## Fase 0 — Antes de escribir una línea de código

Días, no semanas. Es la fase más barata y la que evita rehacer.

Los cinco puntos están en orden de dependencia: el primero produce el material
físico que los dos siguientes necesitan para poder hacerse.

- [x] **0.1 — Generador de códigos en el proyecto real.** Hecho, en
      `src/lib/codigos/`. El mockup no se toca: los códigos se generan desde el
      sistema de verdad, que es donde van a vivir.

      - `code128.ts` — Code 128 subconjunto B escrito a mano (~60 líneas, sin
        dependencias). El código es una identidad, no lleva datos adentro.
      - `codigo.ts` — el formato propio `G` + tipo + secuencia + verificador, con
        los cuatro tipos (`A` artículo, `P` pote, `B` balde, `C` bachada) y una
        lectura que devuelve `null` en vez de explotar: el mostrador escanea
        cualquier cosa.
      - La página de inicio imprime cuatro códigos de muestra, uno por caso.

      El riesgo real de este módulo no es la lógica, son treinta líneas: es un
      dígito mal tipeado en la tabla de patrones de la norma, que genera un
      código que se dibuja perfecto y no lee ninguna pistola. Contra eso hay 23
      tests que verifican los invariantes que la norma garantiza (cada patrón
      mide 11 módulos en 6 elementos, no hay dos iguales) y que codificar y
      decodificar da la vuelta completa. **Lo que ningún test puede probar es
      que la tabla sea la de la norma: eso lo prueba 0.2, con papel y pistola.**

- [ ] **0.2 — Probar la pistola real** con la página de inicio impresa. Enchufarla a
      una PC, abrir un `.txt` y escanear: qué simbologías lee de fábrica (Code
      128, EAN-13, QR), si agrega Enter al final, y qué tan rápido tipea. Todo
      el diseño del lector en el TPV depende de estas tres respuestas. Costo:
      una hoja de papel común.
- [ ] **0.3 — Decidir la impresora de etiquetas** (ver la matriz de abajo) e
      imprimir la misma página en adhesivo, pegarla en un pote, meterla al
      freezer **24 horas** y volver a leerla con la pistola. Esta prueba es
      obligatoria: es donde fallan estos proyectos.
- [ ] **0.4 — Completar el bloque `[CONTEXTO DEL CLIENTE]`** del prompt base. Lo
      que quede en blanco se lista como supuesto explícito en el README.
- [ ] **0.5 — Cerrar las decisiones abiertas** que el mockup dejó planteadas
      (sección "Lo que el mockup deja planteado" del `README.md`): delivery,
      promos, facturación. Ninguna de las tres toca el modelo de datos, así que
      no bloquean el arranque — pero sí cambian el presupuesto, y conviene
      saber cuáles entran antes de cotizar.
      La de un local o varios **ya está cerrada: un solo local.**

### Matriz de impresión (decisión pendiente)

| Opción                                                                  | A favor                                                                                                                                                                                   | En contra                                                                                                                                                                      |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Hojas A4 autoadhesivas** (tipo Avery, se imprimen desde el navegador) | Cero hardware nuevo. Se imprimen 24-30 etiquetas de una. Ideal para bachadas, que se etiquetan de a tandas, y para la hoja de códigos de insumos, que se imprime una vez y se plastifica. | Mala para potes de a uno: hay que gastar una hoja entera o llevar la cuenta de qué casilleros quedan libres. **El adhesivo común se despega con la condensación del freezer.** |
| **Impresora de etiquetas dedicada** (Zebra / Godex / Brother)           | Una etiqueta por vez, sin desperdicio. Es lo correcto para el flujo "armo un pote → imprimo su etiqueta". Hay rollos con adhesivo para congelado.                                         | Hardware a comprar y drivers a resolver. Imprimir desde el navegador a una de estas no es trivial.                                                                             |
| **Térmica de tickets 58/80 mm**                                         | Si igual va a haber una para tickets, sale gratis.                                                                                                                                        | El papel de ticket no es autoadhesivo. Y el papel térmico se decolora con el tiempo y el calor.                                                                                |

**Recomendación**: etiquetadora dedicada para los potes (que salen de a uno,
todo el día), y hoja A4 para las bachadas y para la hoja de códigos de
insumos. Pero es una decisión de compra de Goro, no técnica — el módulo se
diseña con la salida intercambiable para no quedar atado.

---

## Fases de construcción

Cada fase termina en algo que Goro puede tocar y verificar. Ninguna termina en
"está la base de datos hecha".

| #      | Fase                                                                                           | Entregable verificable                                                                                                                                                                                                         |
| ------ | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **1**  | **Núcleo** — auth, roles, layout, navegación, esquema base, RLS ← _aplicado_ | Goro entra con su usuario, Ana entra con el suyo, y cada uno ve un menú distinto                                                                                                                                       |
| **2**  | **Inventario** — baldes identificados, insumos, movimientos, y **edición del producto** ← _escrito, falta aplicar la migración_ | Entran dos baldes de Frutilla; se abre uno y el otro queda entero. Goro le pone a Frutilla un mínimo distinto que al resto y la alerta salta antes solo ahí                                                                    |
| **2b** | **Catálogo** — formatos y precios editables                                                    | Goro crea el formato "Pote 2 kg, 6 sabores", le pone precio, y esa misma tarde aparece en el mostrador sin que nadie toque código                                                                                              |
| **3**  | **Etiquetas y códigos de barras** — el pedido de Goro                                          | Tres cosas: (a) se arma un pote, se pesa, se imprime su etiqueta y la pistola la lee trayendo sabor + peso + precio; (b) se imprime la hoja de códigos de insumos y escanear uno trae el insumo; (c) cada balde recibe su código al entrar |
| **4**  | **Ventas / TPV** — mostrador, **baldes enteros e insumos sueltos**, pistola, anulación         | Se cobra un pote escaneándolo, un cucurucho a dedo y un balde entero, en la misma pantalla y sin cambiar de modo                                                                                                                |
| **5**  | **Caja** — apertura, gastos, cierre con arqueo                                                 | Se cierra el turno y la diferencia contra lo contado a mano da bien                                                                                                                                                            |
| **6**  | **Historial** — ventas del turno, filtros, ticket, anulación                                   | Se busca la venta de hace dos horas, se abre el ticket y se anula: el stock vuelve solo                                                                                                                                        |
| **7**  | **Panel** — vendido del día, ranking de sabores, ventas por hora                               | Goro mira el gráfico de ventas por hora y decide personal para el finde                                                                                                                                                        |
| **8**  | **Usuarios y permisos**                                                                        | Goro le saca a Ana el permiso de anular ventas desde una pantalla, sin llamar a nadie                                                                                                                                          |
| **9**  | **Ciclo del balde** — canje con el proveedor, o venta                                          | Goro entrega un balde vacío contra uno nuevo, y el sistema sabe cuáles se fueron por canje y cuáles vendidos (que son los que le costaron un envase)                                                                           |
| **10** | **Exportar a Excel** — inventario, ventas, caja                                                | Goro baja el inventario a Excel y lo abre en su compu, sin pedirle nada a nadie                                                                                                                                                |

**Por qué la Fase 3 va antes que la Fase 4**: es lo que Goro pidió y lo que
más quiere ver funcionando. Además, diseñar el TPV sabiendo desde el principio
que hay un lector es distinto a agregarle el lector después — el lector no es
un campo más en una pantalla, es una forma de entrada que compite con el dedo.

La Fase 3 entrega **generar, imprimir y leer**; cobrar con eso es la Fase 4.
Esa división es a propósito: deja verificar que la etiqueta funciona antes de
que exista el punto de venta.

Para cuando se llega acá, el generador ya existe y está testeado (paso 0.1) y
la simbología ya fue confirmada contra la pistola de Goro (0.2). La Fase 3 no
descubre nada: le pone las pantallas y la base a algo que ya funciona.

---

## Modelo de datos del módulo de etiquetas (borrador)

Dos tablas, porque las dos naturalezas de código tienen ciclos de vida
distintos: el de artículo se crea una vez y no se toca nunca más; el de unidad
nace, se imprime, se vende y muere.

```
insumos                              -- código de ARTÍCULO
  id
  nombre
  codigo            text unique not null   -- "GA000012", generado al dar de alta
  unidad            enum(u, kg)
  cant, min, costo
```

```
baldes                               -- código de UNIDAD, y la unidad de inventario
  id
  codigo            text unique not null   -- "GB0000042"
  sabor_id          fk sabores
  kg_inicial        numeric           -- lo que traía al entrar
  kg_restante       numeric           -- se descuenta sirviendo; nunca se pisa
  estado            enum(cerrado, abierto, vendido, vacio, canjeado)
  costo             int               -- lo que costó el balde lleno
  costo_envase      int               -- lo que sale reponer el envase si se vende
  venta_id          fk ventas         -- solo si salió por la puerta "vendido"
  entro_en          timestamptz
  salio_en          timestamptz
```

```
potes                                -- código de UNIDAD, armado para el freezer
  id
  codigo            text unique not null   -- "GP0001234"
  balde_id          fk baldes         -- de qué balde salió: trazabilidad
  peso_g            int               -- peso REAL medido en la balanza
  precio            int               -- congelado al imprimir, en pesos enteros
  estado            enum(impreso, vendido, anulado, descartado)
  venta_id          fk ventas         -- null hasta que se cobra
  armado_por        fk usuarios
  armado_en         timestamptz
```

Tres tablas, pero **un solo punto de entrada para el lector**: una función
`resolver_codigo(texto)` que busca en las tres y devuelve qué es y qué hacer con
eso. La pistola manda una cadena y nada más — no sabe, ni tiene que saber, si
lo que escaneó es un insumo, un balde o un pote. Toda pantalla que lea códigos
(vender, recibir mercadería, hacer un ajuste) usa esa misma función. Si mañana
aparece una cuarta naturaleza de código, se agrega ahí y no en cuatro
pantallas.

`kg_restante` vive en el balde y no en el sabor: los kilos de un sabor son la
suma de sus baldes `cerrado` y `abierto`. Un `select` derivado, no una columna
que dos ventas simultáneas puedan pisarse.

Cuatro reglas heredadas de `../lecciones-ciro-polirrubro.md`, aplicadas acá:

1. **`codigo` es `unique` a nivel de índice**, no un `select` previo que
   chequea si existe. Dos etiquetas impresas en el mismo segundo desde dos
   dispositivos tienen que chocar contra el motor, no contra una carrera.
   (Lección 3.)
2. **"Un pote no se cobra dos veces" también es un índice**, no un `if`:
   índice único parcial sobre `venta_id where estado = 'vendido'`, más el
   cambio de estado dentro de la misma transacción que registra la venta.
   Lo mismo para **"un solo balde abierto por sabor"**: índice único parcial
   sobre `sabor_id where estado = 'abierto'`.
3. **Cobrar toca varias cosas a la vez** — el pote o el balde, los kilos, los
   insumos y la caja. Va en **una sola función del lado del servidor**, nunca
   en updates sueltos desde el navegador.
4. **El stock nunca se pisa con un número absoluto.** Imprimir una etiqueta de
   pote es un movimiento de stock (`-262 g de frutilla`), igual que venderla o
   descartarla. Si algo no cierra un lunes, se tiene que poder reconstruir.

Y una regla nueva, propia de este proyecto:

5. **`peso_g` no se calcula, se mide.** Nunca se guarda 250 porque el formato
   se llama "1/4 kilo". Si la balanza dice 262, se guarda 262. El día que
   Goro compare kilos producidos contra kilos vendidos, ese redondeo es
   exactamente la diferencia que no va a poder explicar.

---

## Riesgos

| Riesgo                                                 | Impacto                       | Cómo se cubre                                                                                                                                     |
| ------------------------------------------------------ | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| La etiqueta se despega o se borra en el freezer        | Alto — rompe el módulo entero | Prueba física de 24 h en Fase 0, antes de comprar nada                                                                                            |
| La pistola no lee Code 128 de fábrica                  | Bajo                          | Se cambia el generador a EAN-13 prefijo `2`; el modelo de datos no se toca                                                                        |
| Imprimir de a una etiqueta desde el navegador          | Medio                         | Es el punto flojo de las etiquetadoras. Se prueba en Fase 0 con la impresora candidata                                                            |
| Goro decide después que quiere balanza etiquetadora    | Medio                         | Cambia el flujo de armado, no el modelo. Anotado como decisión abierta                                                                            |
| Un proveedor empieza a mandar mercadería ya etiquetada | Bajo                          | `insumos.codigo` acepta cualquier cadena, no solo las generadas. Se guarda el EAN del proveedor en vez de generar uno, y el resolver no se entera |

---

## Fuera de alcance por ahora

Todo esto se conversa, no se construye todavía. Cada uno es un módulo, no una
pantalla más:

- **Clientes / cuenta corriente.** Goro no lo pidió: hoy cobra al contado. El
  mockup lo muestra porque en el rubro es común (kioscos y clubes que compran
  por mayor y pagan después), y es lo más probable que aparezca más adelante.
  Por eso las ventas se modelan dejándole lugar desde ahora: una venta puede
  llegar a tener un cliente, aunque por ahora siempre sea nulo. Agregar el
  módulo después no debería obligar a migrar las ventas viejas.
- **Producción / bachadas.** Trazabilidad de fábrica: qué se elaboró, con qué
  costo, cuánto rindió. No lo pidió. El balde ya da trazabilidad hacia atrás
  hasta el proveedor, que es lo que hoy necesita.
- **Backups.** No está en los módulos pedidos, pero conviene hablarlo aparte:
  no es una comodidad, es lo que evita perder un año de ventas.
- Venta por peso libre con balanza (hoy hay balanza simple; si aparece una
  etiquetadora, el flujo de armado se rediseña)
- Delivery / pedidos por WhatsApp
- Promos y combos (2x1, happy hour, precio por cantidad)
- Facturación electrónica (ARCA)
- Pantalla al cliente e impresión de tickets (son complementos del prompt
  base, se cotizan aparte)
