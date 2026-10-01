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

**Caja cambia cómo se vende:** desde esa migración no se cobra sin una caja abierta. Hay que
aplicarla **antes** de desplegar el código que la usa; al revés, Ventas muestra "La caja está
cerrada" y no deja cobrar. Después de aplicarla, **ejecutar** las funciones reemplazadas (abrir la
caja, cobrar, anular, cerrar): que se creen sin error no prueba que anden.

Van **en ese orden** (cada una usa lo de la anterior). Después de todas, correr
`carga_productos_goro.sql` (no es una migración: es la carga inicial de las listas de Goro; se puede repetir sin duplicar).

Las primeras cinco **reemplazan** al historial anterior de trece archivos: se reescribieron por módulo con
todos los arreglos ya integrados. Es una excepción a la regla de no editar migraciones aplicadas, y se
hizo porque el sistema todavía no tenía datos reales. De acá en adelante vuelve a valer: una migración
aplicada no se toca, se agrega otra.

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
