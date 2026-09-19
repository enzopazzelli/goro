# Base de datos

Las migraciones se aplican **en orden de nombre**, que es la fecha y hora en
que se escribieron. Nunca se edita una migración ya aplicada: se agrega otra.

## Cómo aplicarlas

En esta máquina no hay Docker, así que `supabase start` no corre. Dos caminos:

**A mano (el que se usa hoy).** Abrir el SQL Editor del proyecto en
supabase.com, pegar el contenido de la migración que falte, ejecutar. Anotar
acá abajo cuál fue la última aplicada.

**Con el CLI (cuando haya Docker).** `npx supabase db push`.

| Migración                      | Aplicada |
| ------------------------------ | -------- |
| `20260912120000_nucleo.sql`    | ✅       |

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

De ahí en más, los usuarios se dan de alta desde la pantalla de Usuarios
(Fase 9; por ahora, repitiendo estos dos pasos).

## Las cuatro reglas

Están en `../AGENTS.md` y se repasan **antes** de escribir cada migración, no
después. En corto:

1. Una operación de negocio = una transacción del lado del servidor.
2. El stock nunca se pisa con un número absoluto: se suma un movimiento.
3. Todo "solo puede haber uno" vive en un índice único, no en un `select` previo.
4. Toda validación de negocio existe también como `check` en la columna.

Y en cualquier función `security definer`, comparar roles con
`coalesce(...)` — nunca un `=` pelado contra algo que puede ser NULL.
