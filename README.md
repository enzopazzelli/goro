# Goro — sistema de gestión para heladería

Carpeta del proyecto **Goro** (heladería artesanal, un solo local).

- `src/` — el sistema real: Next.js App Router + TypeScript + Supabase.
- `index.html` — el mockup de venta. Congelado: sirvió para vender el
  proyecto y no se le agrega nada más.
- `ROADMAP.md` — el plan, con el módulo de códigos de barras que pidió Goro.
- `AGENTS.md` — las convenciones del código. Se leen antes de escribir.

## El sistema

```bash
npm install
npm run dev        # http://localhost:3000
npm run verificar  # formato + lint + typecheck + tests, lo mismo que el CI
```

Todavía no hay núcleo (auth, roles, layout): eso es la Fase 1 del roadmap. Lo
que sí está es el generador de códigos de barras (`src/lib/codigos/`), que es
el paso 0.1 — y la página de inicio existe solo para imprimirlo y probarlo con
la pistola de Goro.

Para conectar Supabase, copiar `.env.local.example` a `.env.local` y
completarlo. Sin eso el sistema levanta igual: todavía nada pega a la base.

## El mockup

### `index.html` — cómo se muestra

Se abre con doble clic. No necesita servidor, ni instalación, ni internet
(salvo para las tipografías de Google Fonts; sin conexión se ve igual, con
las fuentes del sistema).

Todo vive en memoria: **al recargar la página vuelve al estado inicial**.
Eso es a propósito — se puede vender y anular todo lo que se quiera durante
la demo sin ensuciar nada.

### Qué funciona de verdad adentro

| Módulo        | Qué se puede hacer en la demo                                                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vender**    | Elegir formato → tocar sabores → cobrar. Descuenta kilos de cada cubeta y unidades de insumos. Calcula vuelto.                                          |
| **Historial** | Ver todas las ventas, filtrar por forma de pago, abrir el ticket, anular (la anulación devuelve los kilos).                                             |
| **Caja**      | Apertura, gastos, cierre con arqueo y diferencia contra lo contado a mano.                                                                              |
| **Panel**     | Vendido del día, ticket promedio, kilos despachados, ranking de sabores, ventas por hora, formas de pago. Se recalcula con lo que se vendió en la demo. |
| **Stock**     | Cubetas de sabor con nivel visual, insumos, reposición, alertas de mínimo.                                                                              |
| **Clientes**  | Cuentas corrientes de kioscos y clubes, registrar pagos.                                                                                                |
| **Usuarios**  | Usuarios y matriz de permisos por rol.                                                                                                                  |

### Cómo mostrarlo en la reunión (guion de 3 minutos)

1. Arrancá en **Vender**. Armá un kilo de 4 sabores: se ve que nadie escribe
   nada, solo se toca.
2. Cobralo en efectivo con un billete de más → aparece el vuelto.
3. Andá a **Stock**: mostrá que las cubetas de los sabores que acabás de
   vender bajaron, y que Ananá y Chocolate con almendras están en rojo.
4. Andá a **Panel**: la venta ya está en el total del día y en el ranking.
   Mostrá el gráfico de ventas por hora — ahí se decide el personal.
5. Volvé a **Historial**, abrí la venta y anulala: los kilos vuelven solos.

Ese recorrido es el que contesta la pregunta real del cliente, que no es
"¿es lindo?" sino "¿esto me va a hacer perder tiempo en el mostrador?".

### Lo que el mockup deja planteado (y todavía hay que decidir con el cliente)

- **Venta por peso libre (balanza)**. Hoy el flujo es formato → sabores. Si
  también venden pesando a granel, ese flujo hay que rediseñarlo, no
  agregarle un campo.
- **Delivery / pedidos por WhatsApp**. No está en el mockup. Es un módulo
  aparte, no una pantalla más.
- **Producción**. Un sistema de heladería serio ordena también la fábrica
  (qué bachada se hizo, con qué costo, cuánto rindió). Acá solo se repone.
- **Promos y combos** (2x1, happy hour, precio por cantidad).
- **Facturación electrónica** (AFIP/ARCA), si factura.

### De dónde salen las decisiones de diseño

Están escritas en el comentario del encabezado de `index.html` y registradas
en `../bitacora-disenos.md`. Resumen: dirección **setentoso cálido** (la que
le corresponde al rubro), con la paleta corrida a pistacho y dulce de leche
para no caer en el naranja quemado de manual; el arco como único gesto
estructural repetido; y el color real del sabor usado como dato del sistema
en todas las pantallas.

### Qué del mockup NO se copia al sistema

El mockup es HTML plano a propósito: sirve para vender, no para crecer. Dos
cosas que ahí están simplificadas y en producción **no** pueden estarlo, ambas
anotadas en `../lecciones-ciro-polirrubro.md` y ya escritas como regla en
`AGENTS.md`:

1. Registrar una venta toca cuatro cosas a la vez (kilos, insumos, caja,
   cuenta del cliente). Va en **una sola transacción del lado del servidor**,
   nunca en varios updates sueltos desde el navegador.
2. El stock nunca se pisa con un número absoluto: siempre se suma un
   movimiento, para poder reconstruir qué pasó el día que algo no cierra.
