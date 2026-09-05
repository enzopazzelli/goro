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
| Sistema real                   | Andamiaje en pie: Next.js + TypeScript, tema, CI, tests. El generador de códigos ya está hecho (paso 0.1).      |
| Stack                          | Next.js App Router + Supabase (Postgres, Auth, RLS). Un módulo por carpeta, tokens de color en un solo archivo. |
| Hardware confirmado            | Pistola lectora (Goro la tiene). Balanza simple: **pesa y muestra, no imprime**.                                |
| Hardware sin decidir           | Impresora de etiquetas. Impresora de tickets.                                                                   |
| Alcance                        | **Un solo local**, ni ahora ni previsto a futuro. Decidido: el modelo de datos no lleva sucursal.               |
| Códigos de proveedor           | **No hay.** Lo que llega del proveedor viene sin etiquetar. Todo código lo genera el sistema.                   |

---

## 1. El pedido de Goro, traducido

> "Por cada producto que creo en mi inventario quiero generar un código de
> barras para imprimir, y que después mi pistola pueda leerlo."

El pedido es claro, pero esconde una trampa del rubro: **en una heladería
"producto" son tres cosas distintas**, y no todas llevan código propio.

| Qué es                                                             | ¿Lleva código?                                 | Quién lo genera                      | Para qué sirve leerlo                                                              |
| ------------------------------------------------------------------ | ---------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------- |
| **Pote armado** que va al freezer de autoservicio (1/4, 1/2, 1 kg) | Sí, **uno por pote físico**                    | El sistema, al armarlo               | Cobrar en un segundo, con el peso y el precio ya congelados en la etiqueta         |
| **Cubeta / bachada** de producción                                 | Sí, **uno por bachada**                        | El sistema, al producirla            | Trazabilidad: qué lote es, cuándo se hizo, cuánto rindió, cuánto se tiró           |
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
| Se aplica a                | Insumos                                                                                                                | Potes armados, bachadas                                         |
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
│ └────────── tipo: A = artículo (insumo) · P = pote · C = cubeta/bachada
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
        los tres tipos (`A` artículo, `P` pote, `C` bachada) y una lectura que
        devuelve `null` en vez de explotar: el mostrador escanea cualquier cosa.
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
| **1**  | **Núcleo** — auth, roles, layout, navegación, esquema base, RLS                                | Goro entra con su usuario, Ana entra con el suyo, y cada uno ve un menú distinto                                                                                                                                               |
| **2**  | **Stock (M1)** — cubetas por sabor, insumos, movimientos, alertas de mínimo                    | Se repone una cubeta y el nivel sube; se vende a mano y baja; queda el historial de por qué                                                                                                                                    |
| **3**  | **Etiquetas y códigos de barras** — el pedido de Goro                                          | Dos cosas: (a) se arma un pote, se pesa, se imprime su etiqueta y la pistola la lee trayendo sabor + peso + precio; (b) se imprime la hoja de códigos de insumos y escanear uno trae el insumo correcto para cargarle cantidad |
| **4**  | **Ventas / TPV (M3)** — formatos y sabores, lectura de pistola, pago simple y mixto, anulación | Se cobra un pote escaneándolo y se cobra un cucurucho a dedo, en la misma pantalla, sin cambiar de modo                                                                                                                        |
| **5**  | **Caja (M5)** — apertura, gastos, cierre con arqueo                                            | Se cierra el turno y la diferencia contra lo contado a mano da bien                                                                                                                                                            |
| **6**  | **Panel (M4)** — vendido del día, ranking de sabores, ventas por hora                          | Goro mira el gráfico de ventas por hora y decide personal para el finde                                                                                                                                                        |
| **7**  | **Clientes (M2)** — cuenta corriente de kioscos y clubes                                       | Se le fía al Kiosco El Trébol y el saldo queda bien                                                                                                                                                                            |
| **8**  | **Producción / bachadas** — qué se hizo, con qué costo, cuánto rindió                          | Se registra una bachada, sale su etiqueta, y el costo por kilo del sabor se actualiza solo                                                                                                                                     |
| **9**  | **Usuarios y permisos granulares (M8)**                                                        | Goro le saca a Ana el permiso de anular ventas desde una pantalla, sin llamar a nadie                                                                                                                                          |
| **10** | **Reportes, Excel y backups (M7, M9)**                                                         | Se exporta el stock a Excel y se vuelve a importar el mismo archivo                                                                                                                                                            |

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
etiquetas                            -- código de UNIDAD
  id
  codigo            text unique not null   -- "GP0001234"
  tipo              enum(pote, bachada)
  sabor_id          fk sabores
  bachada_id        fk bachadas       -- de qué lote salió: trazabilidad
  peso_g            int               -- peso REAL medido en la balanza
  precio            int               -- congelado al imprimir, en pesos enteros
  estado            enum(impresa, vendida, anulada, descartada)
  venta_id          fk ventas         -- null hasta que se cobra
  impresa_por       fk usuarios
  impresa_en        timestamptz
```

Dos tablas, pero **un solo punto de entrada para el lector**: una función
`resolver_codigo(texto)` que busca en las dos y devuelve qué es y qué hacer con
eso. La pistola manda una cadena y nada más — no sabe, ni tiene que saber, si
lo que escaneó es un artículo o una unidad. Toda pantalla que lea códigos
(vender, recibir mercadería, hacer un ajuste) usa esa misma función. Si mañana
aparece una tercera naturaleza de código, se agrega ahí y no en cuatro
pantallas.

Cuatro reglas heredadas de `../lecciones-ciro-polirrubro.md`, aplicadas acá:

1. **`codigo` es `unique` a nivel de índice**, no un `select` previo que
   chequea si existe. Dos etiquetas impresas en el mismo segundo desde dos
   dispositivos tienen que chocar contra el motor, no contra una carrera.
   (Lección 3.)
2. **"Una etiqueta no se cobra dos veces" también es un índice**, no un `if`:
   índice único parcial sobre `venta_id where estado = 'vendida'`, más el
   cambio de estado dentro de la misma transacción que registra la venta.
3. **Cobrar un pote etiquetado toca cuatro cosas** — la etiqueta, el stock del
   sabor, la caja y (si es cuenta corriente) el saldo del cliente. Va en **una
   sola función del lado del servidor**, nunca en updates sueltos desde el
   navegador.
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

- Venta por peso libre con balanza (hoy hay balanza simple; si aparece una
  etiquetadora, el flujo de armado se rediseña)
- Delivery / pedidos por WhatsApp
- Promos y combos (2x1, happy hour, precio por cantidad)
- Facturación electrónica (ARCA)
- Pantalla al cliente e impresión de tickets (son complementos del prompt
  base, se cotizan aparte)
