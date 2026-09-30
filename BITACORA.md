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
