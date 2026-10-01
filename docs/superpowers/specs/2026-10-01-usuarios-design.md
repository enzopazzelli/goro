# Usuarios — alta, edición y baja desde la pantalla

Acordado con Enzo el 2026-10-01. Hasta hoy `/usuarios` era una lista de solo
lectura y las cuentas se creaban a mano en el panel de Supabase.

## Para qué

Que Goro, como dueño, dé de alta, edite y borre usuarios sin entrar a Supabase.

**Fuera de alcance:** los permisos por acción de la Fase 8 ("sacarle a Ana el
permiso de anular ventas"). Esto es solo el ABM de usuarios.

## Decisiones

| Tema | Decisión | Por qué |
|---|---|---|
| Borrar | **Se borra de verdad si no tiene historial; si lo tiene, se desactiva** y la pantalla lo dice | Un usuario mal creado tiene que poder desaparecer; uno que vendió tiene que seguir figurando en el historial |
| Qué se edita | Nombre, rol, contraseña, usuario de ingreso, y activar / desactivar | Pedido de Enzo |
| Contraseña | La pone y la cambia el dueño. Mínimo 8 caracteres | Los correos son internos y no existen: no hay recuperación por mail |
| Clave de servicio | **Solo para la cuenta de Auth** (crear, renombrar, contraseña, borrar). Nombre, rol y activo se editan con la sesión del dueño, por RLS | La clave de servicio se saltea toda la RLS; cuanto menos pase por ella, menos depende de un `if` |
| Renombrar | Se escribe solo el correo de Auth; un trigger copia el usuario al perfil | Una sola transacción, igual que el alta |
| Reglas duras | En la base: siempre queda un dueño activo; nadie se cambia el rol ni se desactiva a sí mismo; `perfiles.usuario` no se edita directo | Regla 1.4: la pantalla es comodidad, la barrera es la base |

## Base (migración `20261001110000_usuarios.sql`)

- **`proteger_perfiles`**, trigger `before update or delete` sobre `perfiles`:
  rechaza que alguien cambie su propio rol o su propio `activo`, y rechaza
  cualquier cambio o borrado que deje al sistema sin un dueño activo. Vale
  también para un borrado hecho desde el panel de Supabase. Toma un candado
  sobre los dueños para que dos degradaciones cruzadas no pasen las dos.
- **`sincronizar_usuario`**, trigger `after update of email` sobre `auth.users`:
  copia la parte local del correo a `perfiles.usuario`. Si el usuario nuevo
  está repetido o mal formado, falla el cambio entero.
- **`perfiles.usuario` deja de ser editable directo:** el `update` de
  `authenticated` queda limitado a `nombre`, `rol` y `activo`.
- **`perfil_tiene_historial(id)`**, solo dueño: ensaya el borrado del perfil y
  lo deshace. Si una clave foránea lo frena, tiene historial. No lleva una lista
  de tablas, así no queda desactualizada cuando se agregue una.

## Servidor

- `src/lib/supabase/servicio.ts`, detrás de `server-only`: si un componente
  del navegador lo importa, el build falla.
- Acciones en `modulos/auth/consultas/accionesUsuarios.ts`. **Cada una verifica
  contra la base que quien pide es dueño antes de tocar la clave de servicio.**
  - `crearUsuario`: `auth.admin.createUser` (el trigger existente crea el perfil
    como colaborador); si el rol pedido es dueño, lo promueve con la sesión.
  - `editarUsuario`: renombra por Auth si cambió el usuario; nombre y rol por RLS.
  - `cambiarContrasena`: `auth.admin.updateUserById`.
  - `cambiarActivo`: por RLS.
  - `borrarUsuario`: pregunta `perfil_tiene_historial`; con historial desactiva,
    sin historial `auth.admin.deleteUser` (que se lleva el perfil en cascada).
- En el hosting hay que cargar `SUPABASE_SERVICE_ROLE_KEY`.

## Bug existente que se arregla acá

Un usuario desactivado con sesión entraba en un bucle de redirecciones: el
layout lo mandaba a `/ingresar` (sin perfil activo) y el proxy lo devolvía a
`/inicio` (tiene sesión). Con un botón "Desactivar" queda a un clic.

- Al ingresar: si el perfil no está activo, se cierra la sesión recién abierta
  y se responde con el mismo mensaje de credenciales incorrectas.
- Con la sesión ya abierta: `exigirPerfil` manda a `/salir`, una ruta que
  cierra la sesión y redirige a `/ingresar`. Nada enlaza a `/salir` (un `Link`
  la precargaría y cerraría la sesión sola).

## Pantalla `/usuarios` (solo dueño)

- **Nuevo usuario:** nombre, usuario, contraseña, rol. Muestra cómo va a quedar
  el usuario ("va a entrar como `ana.ruiz`").
- **Por fila:** Editar (nombre, usuario, rol), Contraseña, Activar / Desactivar,
  Borrar. En la fila propia, rol, estado y borrar están deshabilitados.
- **Borrar** confirma antes y después dice qué pasó.

## Tests

- **Unitarios:** validación del alta (nombre, contraseña, rol).
- **PGlite, antes de aplicar:** los dos triggers y la función.
- **Base (`auth/rls.test.ts`):** un colaborador no se hace dueño ni edita a
  otro; un dueño no se degrada ni se desactiva; `usuario` no se edita directo;
  el renombre por Auth sincroniza el perfil; `perfil_tiene_historial` distingue
  y no borra nada; borrar una cuenta sin historial sigue funcionando con el
  trigger nuevo.
- **Sin test automático:** las acciones que usan la API de administración
  (corren dentro de Next, con sesión de dueño) y "siempre queda un dueño" contra
  Supabase (probarlo exigiría desactivar a los dueños reales). Lo primero se
  prueba a mano; lo segundo queda cubierto en PGlite.
