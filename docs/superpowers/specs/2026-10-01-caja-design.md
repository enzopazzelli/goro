# Caja — diseño (Fase 5)

Apertura, movimientos de efectivo, cierre con arqueo. Acordado con Enzo el
2026-10-01; Enzo pidió aplicarlo de una, sin plan aparte.

## Para qué

Al cerrar el turno, quien atiende cuenta el cajón y el sistema sabe cuánto
**debería** haber: fondo + ventas en efectivo + ingresos − gastos − retiros −
anulaciones. La diferencia queda guardada. Hasta hoy se vendía sin saber si la
plata cerraba.

## Decisiones

| Tema | Decisión | Por qué |
|---|---|---|
| Vender con la caja cerrada | **No.** `registrar_venta` exige un turno abierto; el error ofrece abrir la caja sin perder el carrito | Cada venta pertenece a un turno y el arqueo siempre cierra |
| Qué ve el colaborador | **Arqueo ciego.** Ve los movimientos, no totales, ni esperado, ni diferencia | Si sabe el número, "cuenta" hasta llegar a él |
| Apertura | **También ciega.** "¿Cuánto hay en el cajón?", sin sugerir nada | Una sugerencia se confirma sin contar |
| Movimientos a mano | **Ingreso, gasto, retiro**, los tres para los dos roles | Si Goro se lleva plata con Ana logueada, Ana tiene que poder anotarlo |
| Entre turnos | Al cerrar se anota el **fondo que queda**; el dueño ve si la apertura siguiente no coincide | Detecta plata que falta entre turnos |
| Turno | **Del local, no de la persona** (`prompt-base-web.md §4`) | Un solo cajón |
| Modelo | **Libro de caja** (`movimientos_caja`); el esperado es una suma | Regla 1.5; el número más importante sale de una sola tabla |
| Anular una venta en efectivo | Sale del turno **abierto ahora**; sin caja abierta no se puede. Tarjeta/transferencia, siempre | La plata sale del cajón de hoy |
| Anular un movimiento a mano | Solo mientras su turno está abierto; queda tachado | Corrige un monto mal tipeado sin borrar rastro |
| Por medio de pago | El dueño ve las ventas del turno por medio (efectivo / tarjeta / transferencia) y las filtra. Consultas largas ("transferencias de la semana"): Historial, Fase 6 | Con arqueo ciego, "efectivo: $X" al colaborador es el esperado servido |
| Permisos | Cualquier sesión activa abre, cierra y carga; los permisos finos son la Fase 8 | Igual que el resto del sistema hoy; cada fila guarda quién |

**Límite honesto del arqueo ciego:** el colaborador ve las ventas del turno
(las necesita para atender) y, sumando a mano, podría deducir el esperado. El
sistema no se lo sirve ni la API se lo devuelve; impedir que sume no es posible.

## Modelo (migración `20261001100000_caja.sql`)

```
turnos_caja        lo lee cualquier sesión
  id, abierto_por, abierto_en, cerrado_por, cerrado_en
  check: cerrado_por y cerrado_en nulos o completos a la vez
  índice único parcial: un solo turno con cerrado_en null

movimientos_caja   el libro; esperado = suma de monto no anulado
  id, turno_id, tipo (apertura|venta|anulacion|ingreso|gasto|retiro)
  monto integer con signo; check del signo por tipo:
    apertura ≥ 0 · venta, ingreso > 0 · anulacion, gasto, retiro < 0
  detalle: obligatorio en ingreso/gasto/retiro, nulo en el resto
  venta_id: obligatorio en venta/anulacion, nulo en el resto
  anulado_por, anulado_en: solo en movimientos a mano
  creado_por, creado_en
  únicos parciales: una apertura por turno; un 'venta' y un 'anulacion' por venta

arqueos            SOLO el dueño lee
  turno_id pk, esperado (congelado al cerrar), contado,
  diferencia generated (contado − esperado),
  fondo_que_queda check entre 0 y contado

ventas.turno_id    fk; check (turno_id is not null) NOT VALID
```

El `not valid` exige turno a toda venta nueva sin romper las ventas de prueba
anteriores a Caja. La "plata que faltó entre turnos" no se guarda: es la
apertura del turno N contra el `fondo_que_queda` del arqueo N−1.

Las tres tablas son de solo lectura para `authenticated`: la única puerta de
escritura son las funciones.

## Funciones

Todas `security definer`, sesión activa con `coalesce(...)`.

- `abrir_caja(p_contado)` → id del turno. El índice único frena la segunda
  apertura; la función traduce el error a "Ya hay una caja abierta."
- `registrar_movimiento_caja(p_tipo, p_monto, p_detalle)`: solo
  ingreso/gasto/retiro. El monto llega positivo; el signo lo pone la función.
- `anular_movimiento_caja(p_id)`: solo a mano, de un turno abierto, no anulado.
- `cerrar_caja(p_contado, p_fondo_que_queda)`: bloquea el turno, congela el
  esperado, escribe el arqueo, cierra. **No devuelve nada.**
- `registrar_venta` (reemplazo): lo primero, el turno abierto `for share`; sin
  turno, `hint = 'caja_cerrada'`. Guarda `turno_id`; en efectivo y con total
  > 0, escribe el movimiento `venta`.
- `anular_venta` (reemplazo): en efectivo y con total > 0, exige caja abierta
  y escribe `anulacion` en ese turno.

**Concurrencia:** las ventas toman el turno `for share` (no se traban entre
sí) y el cierre lo toma `for update`: espera a las ventas en curso, y una venta
que llega después ve el turno cerrado y falla. Ninguna venta queda fuera del
esperado congelado.

**Ticket de $0:** no escribe movimiento de caja (el check de signo lo
rechazaría), así el pendiente "formato activable a $0" no rompe la caja.

## Pantallas

- Menú: 💵 Caja, los dos roles. Insignia "Caja abierta / cerrada" en la barra
  lateral, leída en el layout.
- `/caja` cerrada: "La caja está cerrada" + Abrir caja (modal ciego).
- `/caja` abierta, colaborador: quién abrió y cuándo; botones Ingreso · Gasto ·
  Retiro (un modal, tipo preelegido) y Cerrar caja; movimientos del turno
  filtrables por tipo, con Anular en los manuales. Sin totales. Cerrar pide
  contado y fondo que queda; confirma "Caja cerrada" sin diferencia.
- `/caja` abierta, dueño: además, resumen (fondo, ventas por medio, ingresos,
  gastos y retiros, anulaciones, **debería haber**), ventas del turno
  filtrables por medio, e historial de los últimos 30 turnos con esperado,
  contado, diferencia (siempre visible, también en cero) y la diferencia de
  apertura contra el cierre anterior.
- Ventas: con la caja cerrada, aviso arriba con el mismo modal de apertura; el
  error `caja_cerrada` al cobrar ofrece abrirla sin perder el carrito.
- Los modales con formulario de Caja **no se cierran con clic afuera**
  (lecciones de marlyn: el clic afuera borraba un cierre de caja).

Ubicación: `src/modulos/caja/` (pantallas, consultas, tipos, `rls.test.ts`);
`src/lib/caja.ts` (`turnoAbierto()`) y `src/lib/accionesCaja.ts` (`abrirCaja`)
porque los usan layout, Ventas y Caja; `src/componentes/ModalAbrirCaja.tsx` e
`InsigniaCaja.tsx`. Funciones puras con test: `resumenDelTurno()`,
`textoDiferencia()`, `formatearPlata()`.

## Errores

| Situación | Mensaje |
|---|---|
| Cobrar sin caja | "La caja está cerrada." (`hint = 'caja_cerrada'`) |
| Abrir dos veces | "Ya hay una caja abierta." |
| Fondo mayor a lo contado | "El fondo que queda no puede ser más de lo que contaste." |
| Anular movimiento de turno cerrado | "Solo se pueden anular movimientos de la caja abierta." |
| Anular venta en efectivo sin caja | "Para anular una venta en efectivo tiene que haber una caja abierta: la plata sale del cajón." |

## Tests

- **Unitarios:** `resumenDelTurno()` (por tipo, por medio, sin anulados),
  `textoDiferencia()` (cero, sobra, falta), `formatearPlata()`.
- **Base (`caja/rls.test.ts`):** colaborador no lee `arqueos`, dueño sí; anon
  nada; nadie escribe directo en las tablas; dos aperturas simultáneas, gana
  una; tarjeta no mueve caja, efectivo sí; anulación cruzada cae en el turno
  nuevo; el esperado congelado es igual a `resumenDelTurno()`; `cerrar_caja`
  no devuelve nada.
- **Infraestructura:** los tests de Ventas pasan a necesitar caja abierta
  (`asegurarCajaAbierta()`, y `limpiarVenta()` borra `movimientos_caja`). Como
  "una caja abierta" es global, los `rls.test.ts` corren de a un archivo
  (`npm run test:rls`).
- **Antes de aplicar:** la migración se prueba en PGlite local con estos
  escenarios. **Después de aplicar:** se ejecuta cada función reemplazada.

## Riesgo que este módulo agrava

Los tests de base corren contra el mismo proyecto Supabase que va a usar Goro.
Con Caja, **correrlos con un turno real abierto le cerraría la caja a Goro.**
El staging deja de ser deseable y pasa a ser condición antes de la primera
venta real.

## Fuera de alcance

Consultas de ventas por rango de fechas y medio (Fase 6), permisos finos de
quién anula o retira (Fase 8), exportar la caja a Excel (Fase 10), pago mixto.
