# Base de datos

Las migraciones se aplican **en orden de nombre**, que es la fecha y hora en
que se escribieron. Nunca se edita una migración ya aplicada: se agrega otra.

## Cómo aplicarlas

En esta máquina no hay Docker, así que `supabase start` no corre. Dos caminos:

**A mano (el que se usa hoy).** Abrir el SQL Editor del proyecto en
supabase.com, pegar el contenido de la migración que falte, ejecutar. Anotar
acá abajo cuál fue la última aplicada.

**Con el CLI (cuando haya Docker).** `npx supabase db push`.

| Migración (una por módulo)              | Qué crea                                                                           |
| --------------------------------------- | ---------------------------------------------------------------------------------- |
| `20260930100000_nucleo.sql`             | Perfiles, roles, `auth_rol()` / `es_duenio()` y el alta automática del perfil       |
| `20260930110000_catalogo.sql`           | Formatos y sus precios                                                             |
| `20260930120000_inventario.sql`         | Config del comercio, sabores, insumos (insumo / producto / envase), baldes y ledger |
| `20260930130000_productos.sql`          | Presentaciones (×1, ×12) y las funciones que crean productos y envases             |
| `20260930140000_ventas.sql`             | Ventas, cobro de formatos y productos, anulación y ajustes de balde                |
| `20260930150000_borrar_presentaciones.sql` | El dueño puede borrar una presentación que nunca se vendió                       |
| `20261001100000_caja.sql`               | Turnos de caja, libro de efectivo y arqueo ciego; reemplaza `registrar_venta` y `anular_venta` |
| `20261001110000_usuarios.sql`           | Reglas de perfiles (siempre un dueño activo, nadie se degrada a sí mismo), renombre sincronizado y `perfil_tiene_historial` |
| `20261001120000_panel.sql`              | Las funciones de lectura del Panel (vendido, por hora, kilos por sabor) y el índice de `ventas (creado_en)` |
| `20261001130000_panel_indicadores.sql`  | Por día, por artículo y el costo de lo vendido (margen bruto) |
| `20261003100000_ventas_robustas.sql`    | **Clave de cobro** (un cobro no se registra dos veces) y **costo congelado** en cada movimiento de insumo; reemplaza `registrar_venta` |
| `20261003110000_permisos.sql`           | **Permisos por acción** de cada colaborador (`perfiles.permisos`, `tiene_permiso()`); reemplaza `anular_venta`, `corregir_sabor_venta_item`, `registrar_movimiento_caja`, `anular_movimiento_caja`, `registrar_ajuste_balde` y `registrar_movimiento_insumo` |
| `20261003120000_ciclo_balde.sql`        | **Ciclo del balde**: vaciar, canjear y vender entero; precio del balde entero; reemplaza `registrar_venta`, `anular_venta`, `corregir_sabor_venta_item` y las funciones del Panel |
| `20261004100000_potes_y_codigos.sql`    | **Potes armados** (tabla, armar / anular / descartar / cobrar), `resolver_codigo()` para el lector, balde puntual en la venta y los potes dentro de las cuentas del Panel; reemplaza `registrar_venta`, `anular_venta`, `cobrar_item_balde` y `aplicar_movimiento_balde` |
| `20261006100000_descarte_tipos.sql`     | El tipo de movimiento `descarte` en los ledgers de baldes e insumos. Va sola: un valor de enum no se puede usar en la misma transacción que lo crea |
| `20261006110000_descarte.sql`           | **Descarte**: tabla `descartes` con el costo congelado, `descartar_insumo` y `costo_del_descarte`; reemplaza `vaciar_balde` (pregunta cuánto se tiró) y `descartar_pote` (con motivo, ya sin pedir permiso) |

**Caja cambia cómo se vende:** desde esa migración no se cobra sin una caja abierta. Hay que
aplicarla **antes** de desplegar el código que la usa; al revés, Ventas muestra "La caja está
cerrada" y no deja cobrar. Después de aplicarla, **ejecutar** las funciones reemplazadas (abrir la
caja, cobrar, anular, cerrar): que se creen sin error no prueba que anden.

**Las tres de octubre (`20261003…`) se aplican ANTES de desplegar el código nuevo.** El código lee
`perfiles.permisos` en cada pantalla y llama a `registrar_venta` con la clave de cobro: sin las
migraciones, nadie puede entrar. Y entre sí van en orden: la de ciclo del balde reemplaza funciones que
la de permisos ya había reemplazado. Después de aplicarlas, correr `npm run test:rls`: los tests de
ventas, permisos, ciclo del balde y Panel ejercitan las funciones nuevas contra la base.

**Las dos de descarte (`20261006…`) se aplican en orden, una hoja por migración, y ANTES de desplegar
el código nuevo:** la pantalla de Descarte, "Se terminó" y descartar un pote llaman a las firmas nuevas.
Después correr `npm run test:rls`: `modulos/descarte/rls.test.ts` ejercita todo contra la base.

Van **en ese orden** (cada una usa lo de la anterior). Después de todas, correr
`carga_productos_goro.sql` (no es una migración: es la carga inicial de las listas de Goro; se puede repetir sin duplicar).

Las primeras cinco **reemplazan** al historial anterior de trece archivos: se reescribieron por módulo con
todos los arreglos ya integrados. Es una excepción a la regla de no editar migraciones aplicadas, y se
hizo porque el sistema todavía no tenía datos reales. De acá en adelante vuelve a valer: una migración
aplicada no se toca, se agrega otra.

## Limpiar los datos de prueba (cuando se termina de probar)

`supabase/limpiar_datos_de_prueba.sql` deja la base lista para usar: **borra** ventas, caja, baldes,
potes y el stock (todo vuelve a 0), y **conserva** usuarios, sabores, formatos, insumos, productos,
presentaciones, precios y la configuración. Se pega en el SQL Editor y se puede repetir. Al final
muestra un conteo para comprobar el resultado. Después hay que abrir la caja y cargar el stock real.
No es lo mismo que `reiniciar_base.sql`, que borra `public` entero (incluido el catálogo).

## Reiniciar la base (una sola vez, para pasar al esquema renovado)

**Borra todo lo de `public`, datos incluidos.** Los usuarios de Authentication no se tocan.

1. En el SQL Editor, hoja nueva: pegar `supabase/reiniciar_base.sql` y ejecutar.
2. Una hoja nueva **por cada migración**, en el orden de la tabla de arriba: pegar y ejecutar. Cada una
   tiene que terminar en `Success. No rows returned`.
3. **Recuperar los perfiles.** El paso 1 borró la tabla `perfiles`, así que los usuarios que ya existían
   en Authentication quedaron sin perfil y no pueden entrar. Hoja nueva:

   ```sql
   insert into public.perfiles (id, usuario, nombre)
   select id, split_part(email, '@', 1), initcap(split_part(email, '@', 1)) from auth.users;

   update public.perfiles set rol = 'duenio', nombre = 'Goro' where usuario = 'goro';
   ```

4. Pegar y ejecutar `supabase/carga_productos_goro.sql`. Tiene que mostrar 12 filas: 6 productos y 6 envases,
   con 2 presentaciones cada uno.
5. Entrar al sistema con el usuario de siempre y probar.

## Después de la primera migración: hacerte dueño

Acá se entra con **usuario**, no con correo. Supabase Auth igual exige un email
para crear la cuenta, así que se usa uno interno que nadie lee: el usuario, más
`@heladeria.local` (el dominio sale de `src/config/comercio.ts`).

El trigger le pone rol `colaborador` a todo usuario nuevo, a propósito — si el
rol se leyera de los metadatos del alta, cualquiera que pueda registrarse se
haría dueño solo. Así que el primer dueño se promueve a mano, una única vez:

1. Authentication → Users → **Add user**.
   - Email: `goro@heladeria.local` (así se va a llamar el usuario: `goro`)
   - Password: la que le vayas a dar
   - **Auto Confirm User: sí.** Sin eso queda esperando un mail de
     confirmación que nunca va a llegar, porque el dominio no existe.
2. SQL Editor:

```sql
update public.perfiles set rol = 'duenio', nombre = 'Goro'
where usuario = 'goro';
```

De ahí en más, los usuarios se crean, se editan y se borran desde la pantalla de
Usuarios. Esa pantalla usa la API de administración de Auth, así que el servidor
necesita `SUPABASE_SERVICE_ROLE_KEY`: en `.env.local` para desarrollar **y como
variable de entorno en el hosting**. Sin ella, crear un usuario, renombrarlo,
cambiarle la contraseña o borrarlo falla; el resto del sistema anda igual.

Aplicar `20261001110000_usuarios.sql` **antes** de usar esa pantalla: sin el
trigger, renombrar a alguien cambia con qué usuario entra pero no lo que muestra
la lista, y borrar falla.

## Las cuatro reglas

Están en `../AGENTS.md` y se repasan **antes** de escribir cada migración, no
después. En corto:

1. Una operación de negocio = una transacción del lado del servidor.
2. El stock nunca se pisa con un número absoluto: se suma un movimiento.
3. Todo "solo puede haber uno" vive en un índice único, no en un `select` previo.
4. Toda validación de negocio existe también como `check` en la columna.

Y en cualquier función `security definer`, comparar roles con
`coalesce(...)` — nunca un `=` pelado contra algo que puede ser NULL.
