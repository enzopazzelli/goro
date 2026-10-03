# Guía de traspaso y mantenimiento — Sistema Goro

Guía **para quien mantiene el sistema** (vos, Enzo), no para el usuario del mostrador (esa es `guia-de-uso.html`).
Tiene dos partes: cómo **entregarle el producto a Goro** (GitHub, Supabase y Vercel) y cómo **operarlo y repararlo**
después: vaciar la base, restaurar, destrabar usuarios, resolver los errores que ya conocemos.

> **No pegues ninguna clave en este archivo ni en un chat.** Las tres variables de entorno están descriptas en el
> capítulo 2; los valores reales viven en Vercel, en tu `.env.local` y en el gestor de contraseñas de Goro.

---

## Índice

1. [Cómo está armado](#1-cómo-está-armado)
2. [Las tres variables de entorno](#2-las-tres-variables-de-entorno)
3. [Estrategia de traspaso: qué conviene](#3-estrategia-de-traspaso-qué-conviene)
4. [Paso a paso: Supabase](#4-paso-a-paso-supabase)
5. [Paso a paso: Vercel](#5-paso-a-paso-vercel)
6. [Paso a paso: GitHub](#6-paso-a-paso-github)
7. [Lista de verificación del traspaso](#7-lista-de-verificación-del-traspaso)
8. [Qué se le entrega a Goro (y qué no)](#8-qué-se-le-entrega-a-goro-y-qué-no)
9. [Trabajo diario: actualizar el sistema](#9-trabajo-diario-actualizar-el-sistema)
10. [Backups y restauración](#10-backups-y-restauración)
11. [Vaciar y reiniciar la base](#11-vaciar-y-reiniciar-la-base)
12. [Usuarios: recuperar el acceso](#12-usuarios-recuperar-el-acceso)
13. [Solución de problemas](#13-solución-de-problemas)
14. [Consultas SQL útiles](#14-consultas-sql-útiles)
15. [Ajustes que se hacen en el código](#15-ajustes-que-se-hacen-en-el-código)

---

## 1. Cómo está armado

Tres piezas, cada una con su dueño y su cuenta:

| Pieza | Para qué sirve | Qué guarda |
| --- | --- | --- |
| **GitHub** | El código fuente. | Los archivos del proyecto, el historial de cambios y el CI. **Nunca** claves. |
| **Vercel** | Ejecuta el sistema en internet (la web que abre Goro). | El sitio publicado y las variables de entorno. |
| **Supabase** | La base de datos (Postgres), el ingreso de usuarios (Auth) y las reglas de seguridad (RLS). | **Todos los datos del negocio**: ventas, caja, stock, usuarios. |

```
Goro (navegador) ──► Vercel (Next.js) ──► Supabase (Postgres + Auth)
                          ▲
                   GitHub ┘  (cada push a la rama principal publica solo)
```

Lo que hay que tener claro antes de empezar:

- **Los datos viven en Supabase, no en Vercel ni en GitHub.** Si se pierde el proyecto de Supabase sin backup, se pierde el negocio. Por eso el capítulo 10 es obligatorio.
- **El código y la base se actualizan por separado.** Un cambio de código que usa una columna o función nueva necesita su migración aplicada **antes**. Si no, el sistema se rompe (el capítulo 9 lo explica con el caso real).
- **Las claves nunca van en el repositorio.** `.env.local` está en `.gitignore`; en el repo solo existe `.env.local.example`, sin valores.
- Es **un solo local**, ni ahora ni previsto a futuro: no hay sucursales en el modelo de datos.

---

## 2. Las tres variables de entorno

Son las únicas. Salen de Supabase → *Project Settings* → *API* (o *API Keys*, según la versión del panel).

| Variable | Qué es | ¿Es secreta? | Dónde va |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | La dirección del proyecto (`https://xxxx.supabase.co`). | No | Vercel y `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | La clave pública (`anon`, o `publishable` en el panel nuevo). El navegador la usa; la seguridad real la dan las reglas RLS. | No (se ve en el navegador) | Vercel y `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | La clave de servicio (`service_role`, o `secret` en el panel nuevo). **Se saltea toda la seguridad.** Solo la usa el servidor, para crear, renombrar y borrar cuentas de usuario. | **Sí. Nunca en el navegador, nunca en el repo, nunca en un chat.** | Vercel y `.env.local` |

> **Importante:** las variables que empiezan con `NEXT_PUBLIC_` se **incrustan en el sitio al compilarlo**. Si las cambiás en Vercel, hay que **volver a desplegar** (*Redeploy*) para que tomen efecto. La de servicio se lee en el servidor, pero conviene redesplegar igual.

Si falta alguna, el sistema compila igual y falla recién al hablar con la base, con un mensaje que dice cuál falta
(`Falta NEXT_PUBLIC_SUPABASE_URL…`).

---

## 3. Estrategia de traspaso: qué conviene

Hay dos formas de pasarle el sistema a Goro. Elegí una antes de tocar nada.

| | **A. Proyecto nuevo en la cuenta de Goro** (recomendada) | **B. Transferir el proyecto actual** |
| --- | --- | --- |
| Qué es | Goro crea su cuenta de Supabase, y se arma un proyecto limpio: migraciones, catálogo, usuario dueño. | Se mueve el proyecto de Supabase que usás hoy a la organización de Goro. |
| Datos de prueba | No viajan. Arranca limpio. | Viajan (hay que correr el script de limpieza). |
| Claves | **Nuevas** (las de tu proyecto de pruebas no quedan en manos de nadie más). | Las mismas (si las compartiste en algún lado, siguen vivas). |
| Trabajo | Aplicar 14 migraciones y cargar el catálogo. | Pocos pasos, pero hay que depurar. |
| Riesgo | Bajo. | Medio: arrastra historia de pruebas y claves viejas. |

**Recomendación: A.** Tu proyecto actual pasa a ser tu **proyecto de pruebas** (donde corren `npm run test:rls` y donde probás
cambios), y producción es un proyecto aparte, a nombre de Goro. Así los tests de base —que crean y borran usuarios y filas—
**nunca tocan los datos reales**.

> **Ojo:** `npm run test:rls` está pensado para un proyecto de **prueba**. Crea usuarios y datos y abre y cierra la caja (el test de caja
> directamente **se niega a correr si hay una caja abierta**). Nunca lo apuntes a la base de producción.

Para el resto de la guía se asume la opción A. Si elegís B, los pasos de Supabase se reemplazan por *Project Settings →
General → Transfer project* y después se corre `limpiar_datos_de_prueba.sql` (capítulo 11); el resto es igual.

### Quién paga qué (hablarlo con Goro antes)

Los planes y precios cambian: **verificalos el día del traspaso** en las páginas de precios de cada servicio.

- **Supabase.** El plan gratuito **pausa el proyecto tras un período de inactividad** y **no incluye backups
  descargables ni restauración a un punto en el tiempo**. Para un negocio que vive de esta base, lo prudente es un plan de pago
  con backups diarios. Es la decisión de costo más importante de todas.
- **Vercel.** El plan gratuito (*Hobby*) está pensado para **uso personal y no comercial** según sus términos. Un negocio real
  debería usar el plan de equipo (*Pro*). Revisá sus términos vigentes.
- **GitHub.** Un repositorio privado es gratis en una cuenta personal u organización gratuita.
- **Dominio propio** (opcional): se compra aparte. Sin dominio, el sitio vive en `algo.vercel.app` y anda igual.

Definí también **quién es el titular de cada cuenta** (debería ser Goro, con tu usuario invitado como colaborador) y
**cómo se cobra el mantenimiento** de ahí en adelante.

---

## 4. Paso a paso: Supabase

### 4.1 Cuenta y proyecto

1. Goro crea su cuenta en [supabase.com](https://supabase.com) (con **su** correo) y activa la **verificación en dos pasos**.
2. Crea una **organización** (el nombre del comercio) y, si corresponde, elige el plan.
3. Lo invita a vos a la organización como **Developer** o **Administrator** (*Organization settings → Team*).
4. Se crea el proyecto:
   - **Nombre:** el del comercio.
   - **Región:** la más cercana a Argentina (*South America — São Paulo*).
   - **Contraseña de la base:** generala larga y guardala **ya** en el gestor de contraseñas; Supabase no la vuelve a mostrar.
5. Cuando termine de crearse, en *Project Settings → API*, anotá la URL y las dos claves (capítulo 2).

### 4.2 Cerrar el registro público (no te lo saltees)

El ingreso usa la API pública de Auth. Con el registro abierto, **cualquier persona que conozca la dirección del proyecto
podría crearse una cuenta**, y toda cuenta nueva nace como *colaborador* con los permisos por defecto.

1. *Authentication → Sign In / Providers* (en algunas versiones, *Providers → Email*).
2. Desactivá **Allow new users to sign up**.
3. Dejá **Confirm email** como esté: las cuentas se crean desde la pantalla *Usuarios* del sistema con la API de administración,
   que las confirma sola y **sigue funcionando con el registro cerrado**.

> **Probalo:** después de desactivarlo, entrá a la pantalla *Usuarios* del sistema y creá un usuario de prueba. Tiene que andar.

También, en *Authentication → URL Configuration*, poné como *Site URL* la dirección final del sistema (no se usan mails, pero
evita avisos).

### 4.3 Seguridad de la API de datos

La base está diseñada con **"Automatically expose new tables" apagado**: una tabla nueva no es visible por la API hasta que
la migración le da su `grant` explícito, y cada migración ya lo hace. Al crear el proyecto, **dejá esa opción apagada**
(*Project Settings → Data API*, o en el asistente de creación). Es una red de seguridad: si alguien agrega una tabla y
se olvida de la política, queda cerrada en vez de abierta.

### 4.4 Aplicar las migraciones

Las migraciones están en `supabase/migrations/` y **se aplican en orden de nombre**, una por hoja del SQL Editor
(*SQL Editor → New query*, pegar el contenido, *Run*). **Cada una tiene que terminar en `Success. No rows returned`.**

| # | Archivo | Qué crea |
| --- | --- | --- |
| 1 | `20260930100000_nucleo.sql` | Perfiles, roles, `auth_rol()` / `es_duenio()`, alta automática del perfil |
| 2 | `20260930110000_catalogo.sql` | Formatos y precios |
| 3 | `20260930120000_inventario.sql` | Config del comercio, sabores, insumos, baldes, ledger |
| 4 | `20260930130000_productos.sql` | Presentaciones (Unidad, Docena) y funciones de productos |
| 5 | `20260930140000_ventas.sql` | Ventas, cobro, anulación, ajustes |
| 6 | `20260930150000_borrar_presentaciones.sql` | Borrar una presentación nunca vendida |
| 7 | `20261001100000_caja.sql` | Turnos, libro de efectivo, arqueo ciego |
| 8 | `20261001110000_usuarios.sql` | Reglas de perfiles y alta/baja de usuarios |
| 9 | `20261001120000_panel.sql` | Funciones de lectura del Panel |
| 10 | `20261001130000_panel_indicadores.sql` | Por día, por artículo, costo de lo vendido |
| 11 | `20261003100000_ventas_robustas.sql` | Clave de cobro (sin doble cobro) y costo congelado |
| 12 | `20261003110000_permisos.sql` | Permisos por acción |
| 13 | `20261003120000_ciclo_balde.sql` | Vaciar, canjear y vender balde entero |
| 14 | `20261004100000_potes_y_codigos.sql` | Potes armados y `resolver_codigo` |

> **Regla de oro:** una migración ya aplicada **no se edita**. Si hay que cambiar algo, se agrega otra con fecha nueva.

Alternativa con el CLI (`npx supabase link` y `npx supabase db push`): sirve, pero la vía que está probada en este
proyecto es la del SQL Editor.

Para confirmar que quedaron todas, corré las consultas del [capítulo 14](#14-consultas-sql-útiles) ("¿Qué migraciones están aplicadas?").

### 4.5 El usuario dueño

El primer dueño se crea a mano, **una sola vez** (el sistema no le asigna ese rol a nadie solo, a propósito):

1. *Authentication → Users → Add user → Create new user*.
   - **Email:** `goro@heladeria.local` (el usuario con el que entra va a ser `goro`).
   - **Password:** la que le vaya a dar.
   - **Auto Confirm User:** *sí*. Sin eso queda esperando un mail de confirmación que nunca llega.
2. *SQL Editor*:

```sql
update public.perfiles set rol = 'duenio', nombre = 'Goro'
where usuario = 'goro';
```

Desde ahí, todos los usuarios se crean, editan y borran desde la pantalla *Usuarios* del sistema.

> **Ojo:** el dominio `@heladeria.local` es interno y no existe; nadie lo lee ni lo ve. **No lo cambies después**: queda
> grabado en el correo de cada cuenta y cambiarlo obliga a migrar todas.

### 4.6 El catálogo inicial

Dos caminos:

- **Cargar las listas de Goro:** correr `supabase/carga_productos_goro.sql`. Crea 6 productos y 6 envases (12 filas) y 6 formatos,
  todo **inactivo y a $0**; Goro les pone precio desde *Inventario*. Se puede repetir sin duplicar.
- **Copiar el catálogo ya trabajado** desde tu proyecto de pruebas: no hay una herramienta para eso. Lo más simple es cargarlo a
  mano desde la pantalla o con un `pg_dump` solo de esas tablas (`sabores`, `formatos`, `insumos`, `presentaciones_insumo`).

### 4.7 Un proyecto de pruebas aparte

Si conservás tu proyecto actual como **proyecto de pruebas**, ahí corrés `npm run test:rls` (con su propio `.env.local`) y
probás las migraciones antes de aplicarlas en producción. Es gratis y evita accidentes. Podés habilitar el job de seguridad
del CI para que lo use (capítulo 6).

---

## 5. Paso a paso: Vercel

1. Goro crea su cuenta en [vercel.com](https://vercel.com) con **su** correo, activa la verificación en dos pasos y elige el
   plan según el capítulo 3. Te invita al equipo.
2. **Conectar GitHub:** *Add New → Project → Import Git Repository*. Si el repositorio ya está en la cuenta de Goro (capítulo 6),
   Vercel lo lista; si no, hay que instalar la app de Vercel en esa cuenta de GitHub.
3. **Configuración del proyecto:**
   - *Framework Preset:* **Next.js** (lo detecta solo).
   - *Root Directory:* la raíz del repositorio.
   - *Build Command / Output:* los de por defecto (`next build`).
   - *Node.js Version* (*Settings → General*): **22.x**, la misma que usa el CI.
   - *Production Branch* (*Settings → Git*): la rama principal del repositorio (hoy `master`).
4. **Variables de entorno** (*Settings → Environment Variables*): cargá las tres del capítulo 2 en **Production**.
   - `SUPABASE_SERVICE_ROLE_KEY` marcala como **Sensitive** si el panel lo permite.
   - **Preview:** si dejás las variables también en *Preview*, cada rama de prueba hablará con la base **de producción**.
     Lo prudente es no cargarlas ahí, o cargar las de tu proyecto de pruebas.
5. **Región de las funciones** (*Settings → Functions*): elegí la más cercana a Supabase y a Argentina (São Paulo, `gru1`).
   Cada pantalla hace varias consultas a la base; que servidor y base estén cerca se nota.
6. *Deploy*. Cuando termine, abrí la dirección, entrá como dueño y revisá la lista del capítulo 7.
7. **Dominio propio** (opcional): *Settings → Domains*, y seguir las instrucciones de DNS. Después actualizá el *Site URL* de Supabase.

### Publicar y volver atrás

- Cada **push** a la rama de producción publica solo.
- Para **volver atrás**: *Deployments* → elegir el despliegue anterior que andaba → *Promote to Production* (o *Instant Rollback*).
  Esto revierte **el código**, **no la base**: si el despliegue nuevo traía una migración, la base queda como está.
  Por eso las migraciones se escriben para ser compatibles hacia atrás cuando se puede.
- **Logs:** *Deployments → (el despliegue) → Logs* y *Logs* del proyecto. Los errores de las acciones del servidor y de los Excel
  se registran ahí (`console.error`).

---

## 6. Paso a paso: GitHub

El repositorio hoy está en `github.com/enzopazzelli/goro`.

1. Goro crea su cuenta (o una organización con el nombre del comercio), con verificación en dos pasos.
2. **Transferir el repositorio:** en el repo, *Settings → General → Danger Zone → Transfer ownership* → escribir el usuario u
   organización de destino. Lo acepta Goro. La transferencia **conserva el historial, issues y la configuración**.
   - Alternativa: que **Goro cree un repositorio privado vacío** y vos empujes el código con `git remote set-url` y `git push`.
3. **Mantené tu acceso:** que Goro te agregue como *colaborador* (*Settings → Collaborators*), o creá un equipo.
4. En tu copia local: `git remote set-url origin https://github.com/<nuevo-dueño>/goro.git`.
5. **Revisá que no haya claves en el historial:** `.env.local` nunca se versionó (está en `.gitignore`). Si en algún momento se
   subió una clave por error, **rotala en Supabase** (*Project Settings → API → regenerar*); borrar el archivo después no la
   saca del historial.
6. Repositorio **privado**.
7. Volvé a conectar Vercel con el repositorio si cambió de dueño (capítulo 5).

### El CI (`.github/workflows/ci.yml`)

En cada push y pull request corre: formato, lint, typecheck, tests unitarios y `npm run build`. Es lo mismo que `npm run verificar`
más el build.

Hay un segundo job, **`seguridad`**, que corre los tests de base (RLS) y **está apagado**. Se enciende creando la variable de
repositorio `SUPABASE_PRUEBAS=si` y tres secretos con las claves de **tu proyecto de pruebas** (jamás las de producción):
`SUPABASE_URL_PRUEBAS`, `SUPABASE_ANON_KEY_PRUEBAS` y `SUPABASE_SERVICE_ROLE_KEY_PRUEBAS`. Ojo: ese job hoy solo corre el test de
inventario, no toda la suite.

---

## 7. Lista de verificación del traspaso

Hacela completa, con Goro al lado, en la dirección **de producción**.

**Cuentas y seguridad**
- [ ] Goro es el titular de GitHub, Vercel y Supabase, todas con verificación en dos pasos.
- [ ] Vos figurás como colaborador/miembro en las tres.
- [ ] El registro público de Supabase está **desactivado** (4.2) y crear un usuario desde el sistema igual funciona.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` está **solo** en Vercel (y en tu `.env.local`); no está en el repositorio.
- [ ] Las claves de producción **no** son las de tu proyecto de pruebas.
- [ ] Las contraseñas están en un gestor de contraseñas, no en papeles ni mensajes.

**Base de datos**
- [ ] Las 14 migraciones están aplicadas (consulta del capítulo 14).
- [ ] Existe el usuario dueño y entra.
- [ ] El catálogo está cargado y los precios puestos.
- [ ] **Backups:** activos y **una restauración probada** en el proyecto de pruebas (capítulo 10).

**Sistema**
- [ ] Se puede entrar con el dueño. Se crea un colaborador desde *Usuarios* y entra.
- [ ] Se abre la caja, se cobra algo en efectivo, se anula, y se cierra la caja.
- [ ] Se arma un pote, se imprime su etiqueta y se cobra tipeando el código.
- [ ] Se baja un Excel de inventario, de ventas y de caja.
- [ ] La impresión de etiquetas sale limpia (solo la hoja, sin menú).
- [ ] La hora de las ventas es la de Argentina.
- [ ] Se corrió `limpiar_datos_de_prueba.sql` **después** de las pruebas, y antes de la primera venta real (capítulo 11).
- [ ] La caja quedó **cerrada** y la base **en cero**, lista para el primer turno de verdad.

**Entrega**
- [ ] Goro tiene la `guia-de-uso.html` y sabe dónde está.
- [ ] Acordaron soporte, quién paga cada servicio y cómo se piden los cambios.

---

## 8. Qué se le entrega a Goro (y qué no)

**Sí:**
- La dirección del sistema y **su usuario** de dueño (usuario y contraseña, cambiada en el primer ingreso).
- La guía de uso (`guia-de-uso.html`).
- Los accesos como **titular** de GitHub, Vercel y Supabase (credenciales y códigos de recuperación de la verificación en dos pasos).
- Un cuaderno o archivo (en su gestor de contraseñas) con **qué cuenta es de qué servicio**.

**No hace falta, y mejor no:**
- La **contraseña de la base** y la **clave de servicio** no tienen por qué estar en su celular ni en su correo. Quedan en el
  gestor de contraseñas y en Vercel. Si se las dan a cualquiera, esa persona se saltea toda la seguridad.
- Que cada colaborador comparta usuario: cada persona tiene el suyo, para que la caja y las ventas queden a su nombre.

---

## 9. Trabajo diario: actualizar el sistema

### Cambiar código

1. Trabajás en tu máquina con `npm run dev`.
2. Antes de subir: **`npm run verificar`** (formato, lint, typecheck y tests unitarios) y, si tocaste algo grande, `npm run build`.
3. `git push` → corre el CI → Vercel publica solo.

### Cambiar la base (migraciones)

> **Orden: primero la migración, después el código.**

El caso real que lo enseñó: el código nuevo leía `perfiles.permisos` en cada pantalla. Desplegado **antes** de aplicar la
migración, **nadie podía entrar**. Con el código viejo y la migración nueva, en cambio, todo seguía andando.

Entonces:

1. Escribís la migración con fecha nueva en `supabase/migrations/`, con RLS, `grant` explícito y reglas de seguridad
   (están en `AGENTS.md`).
2. La aplicás **primero en tu proyecto de pruebas** y corrés `npm run test:rls`.
3. Si pasa, la aplicás en **producción** (SQL Editor).
4. **Recién entonces** publicás el código que la usa.
5. Anotás la migración en `supabase/README.md` y en la bitácora.

Cuando una migración cambia qué devuelve una función o agrega funciones y la API "no las ve", se refresca con:

```sql
notify pgrst, 'reload schema';
```

### Pruebas

| Comando | Qué hace | Dónde |
| --- | --- | --- |
| `npm run verificar` | Formato + lint + typecheck + tests unitarios | Tu máquina y el CI |
| `npm run test:unit` | Solo los tests unitarios | Tu máquina |
| `npm run test:rls` | Tests de seguridad contra una base real | **Solo contra el proyecto de pruebas** |
| `npm run build` | Compila como en producción | Tu máquina y el CI |

---

## 10. Backups y restauración

> **Un respaldo que nunca se restauró no es un respaldo.** Hay que probarlo.

### Qué cubre cada cosa

- **Los backups del plan de Supabase** (si el plan los incluye): son la primera línea. Revisá en *Database → Backups* qué
  ofrece el plan elegido y cuántos días guarda.
- **Un volcado manual** (`pg_dump`): sirve como segunda copia, para tenerla fuera de Supabase y para llevar la base a otro proyecto.
- **Los Excel NO son un backup:** son reportes. No sirven para reconstruir el sistema.

### Hacer un volcado manual

Necesitás las herramientas de PostgreSQL (`pg_dump`, `pg_restore`) instaladas, y la cadena de conexión (*Project Settings →
Database → Connection string*). Si tu red no soporta IPv6, usá la cadena del **Session pooler**.

```bash
# Datos del negocio (esquema public) en formato comprimido
pg_dump "postgresql://postgres:<CONTRASEÑA>@<HOST>:5432/postgres" \
  --schema=public --no-owner --format=custom --file=goro-public-AAAA-MM-DD.dump

# Las cuentas de usuario viven en el esquema auth (hace falta para restaurar a las mismas personas)
pg_dump "postgresql://postgres:<CONTRASEÑA>@<HOST>:5432/postgres" \
  --schema=auth --no-owner --format=custom --file=goro-auth-AAAA-MM-DD.dump
```

Guardá los archivos **fuera** de tu computadora de trabajo (un disco externo o un almacenamiento en la nube de Goro). Un volcado
contiene datos sensibles: tratalo como una clave.

### Restaurar (siempre primero en el proyecto de pruebas)

1. Creá un proyecto vacío (o vaciá el de pruebas con `reiniciar_base.sql`, capítulo 11).
2. Restaurá:

```bash
pg_restore --no-owner --clean --if-exists \
  --dbname "postgresql://postgres:<CONTRASEÑA>@<HOST>:5432/postgres" \
  goro-public-AAAA-MM-DD.dump
```

3. Verificá: entrá al sistema, mirá que estén las ventas, el stock y que los usuarios puedan ingresar.
4. Si restauraste en otro proyecto, **actualizá las variables de entorno** de Vercel con las claves de ese proyecto y redesplegá.

> **Ojo:** si falló el restore de `auth`, las personas quedan sin cuenta y sin perfil. La salida está en el capítulo 12
> (recrear perfiles y volver a crear el usuario dueño).

### Frecuencia sugerida

- Backups del plan: los diarios que ofrezca.
- Un volcado manual **antes de cada migración grande** y **una vez por semana**, mientras no haya otro mecanismo.
- Una **prueba de restauración cada tanto** (por ejemplo, una vez por trimestre).

---

## 11. Vaciar y reiniciar la base

Hay **tres niveles**, de menos a más destructivo. Elegí el mínimo que resuelva tu caso.
Todos se corren pegando el contenido en el **SQL Editor** de Supabase.

> **Antes de cualquiera:** si hay datos reales, hacé un volcado (capítulo 10). **No hay deshacer.**

| Nivel | Script | Qué borra | Qué conserva |
| --- | --- | --- | --- |
| 1. Limpiar datos de prueba | `supabase/limpiar_datos_de_prueba.sql` | Ventas, caja, baldes, potes, stock y su historial | Usuarios, sabores, formatos, insumos, productos, presentaciones, precios, configuración |
| 2. Reiniciar la base | `supabase/reiniciar_base.sql` | **Todo** lo de `public`: tablas, datos, funciones, políticas | Solo las cuentas de Auth (sin perfil) |
| 3. Proyecto nuevo | (crear otro proyecto) | — | El proyecto viejo queda intacto |

### Nivel 1 — Limpiar los datos de prueba

Es lo que se usa **al terminar de probar, antes de la primera venta real**. Se puede repetir.

1. Verificá que no haya una caja abierta de verdad (si la hay, se pierde).
2. Pegá `supabase/limpiar_datos_de_prueba.sql` y ejecutalo.
3. Al final muestra un conteo: las filas de ventas, caja, baldes, potes y movimientos tienen que dar **0**, y lo que se conserva tiene que seguir ahí.

Después:
1. Abrir la caja (*Caja → Abrir caja*).
2. Cargar el stock real: baldes por *Balde nuevo*, mercadería por *Recibir mercadería* o *Cargar*.

Efectos que conviene saber:
- Los números **reinician**: la primera venta vuelve a ser la #1; el primer balde y el primer pote, el 1 de su serie.
- Los códigos de los **insumos no se reinician** (son los mismos artículos), así que las etiquetas de estante siguen valiendo.
- Las etiquetas de **baldes y potes** impresas antes de limpiar **dejan de servir**: esos códigos se vuelven a generar.
- Los estantes con códigos de baldes viejos van a decir "no está cargado": hay que reimprimirlos.

### Nivel 2 — Reiniciar la base entera

Se usa si la estructura quedó inconsistente o para reconstruir un proyecto de pruebas desde cero. **Borra también el catálogo.**

1. Pegá y ejecutá `supabase/reiniciar_base.sql` (borra y recrea el esquema `public`).
2. Aplicá **todas las migraciones, en orden** (capítulo 4.4), una por hoja.
3. **Recuperá los perfiles.** El paso 1 borró la tabla `perfiles`, así que las cuentas que ya existían en Authentication quedaron
   sin perfil y no pueden entrar:

```sql
insert into public.perfiles (id, usuario, nombre)
select id, split_part(email, '@', 1), initcap(split_part(email, '@', 1)) from auth.users;

update public.perfiles set rol = 'duenio', nombre = 'Goro' where usuario = 'goro';
```

4. Cargá el catálogo: `supabase/carga_productos_goro.sql` (tiene que mostrar 12 filas).
5. Entrá con el dueño y probá.

> **Ojo:** los colaboradores recuperados quedan con el perfil por defecto (rol *colaborador*, todos los permisos). Revisalos desde *Usuarios*.

### Nivel 3 — Proyecto nuevo

Si algo se rompió de forma que no vale la pena reparar, es más rápido crear un proyecto nuevo y repetir el capítulo 4. El viejo queda como evidencia.

### Borrados parciales (no recomendados)

No hay un botón para borrar "solo las ventas de hoy": las tablas se referencian entre sí (ventas, renglones, movimientos de caja, de
stock, de baldes y de insumos, potes) y borrar una fila suelta deja el stock y la caja **descuadrados**. Los caminos correctos:

- **Una venta de prueba:** anularla desde el sistema (*Historial → Anular*). Devuelve el stock y la caja y deja constancia.
- **Un sabor, formato, insumo o balde cargado por error:** desde *Inventario* (solo se puede borrar lo que nunca se usó).
- **Todo lo de prueba junto:** nivel 1.

---

## 12. Usuarios: recuperar el acceso

### El dueño olvidó su contraseña

Si hay **otro dueño** activo, entra y se la cambia en *Usuarios → Contraseña*. Si es **el único**, hay dos caminos:

**a) Desde Supabase** (*Authentication → Users*, elegir el usuario): si tu panel ofrece cambiar la contraseña, usalo. Si no, el camino b.

**b) Con un script** que usa la clave de servicio (corrélo en tu máquina, con las variables cargadas; **nunca** lo subas al repo):

```js
// cambiar-contrasena.mjs — node cambiar-contrasena.mjs <usuario> <contraseña nueva>
import { createClient } from "@supabase/supabase-js";

const [usuario, contrasena] = process.argv.slice(2);
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: perfil } = await admin.from("perfiles").select("id").eq("usuario", usuario).single();
const { error } = await admin.auth.admin.updateUserById(perfil.id, { password: contrasena });
console.log(error ? error.message : "Listo.");
```

La contraseña tiene que tener **al menos 8 caracteres**.

### Nadie es dueño (o el dueño quedó desactivado)

El sistema impide dejar la base sin dueño activo, pero un reinicio o un error pueden dejarla así. Desde el SQL Editor:

```sql
update public.perfiles
set rol = 'duenio', activo = true
where usuario = 'goro';
```

### Una persona ve la pantalla de ingreso en bucle, o "no tiene perfil"

El usuario existe en Authentication pero **no tiene fila en `perfiles`** (pasa después de reiniciar la base) o está **desactivado**.
Mirá `select usuario, rol, activo from public.perfiles;` y, si falta, usá el `insert` del nivel 2 (capítulo 11).

### Alguien se registró solo (registro público abierto)

Si encontrás cuentas que nadie creó, el registro público estaba abierto. **Cerralo ya** (4.2), desactivá o borrá esas cuentas desde
*Usuarios* y revisá *Historial* por si alguna vendió algo.

### Un colaborador "no ve" un botón

No es un error: le falta un permiso. Se le da en *Usuarios → Editar* (guía de uso, capítulo 10).

---

## 13. Solución de problemas

Buscá el síntoma. Casi todo tiene una causa conocida.

| Síntoma | Causa probable | Qué hacer |
| --- | --- | --- |
| **Nadie puede entrar** justo después de publicar. | El código nuevo usa algo que la base todavía no tiene (por ejemplo `perfiles.permisos`). | Aplicar las migraciones pendientes (capítulo 14 para saber cuáles faltan). Orden: migración primero. |
| Pantalla de error con `Falta NEXT_PUBLIC_SUPABASE_URL…`. | Falta una variable de entorno en Vercel. | Cargarla y **redesplegar** (las `NEXT_PUBLIC_` van incrustadas). |
| `Invalid API key`. | Clave pegada con un espacio o salto de línea, o de otro proyecto. | Volver a copiarla desde *Project Settings → API*; redesplegar. |
| **Crear, renombrar o borrar un usuario falla.** | Falta `SUPABASE_SERVICE_ROLE_KEY` en Vercel. | Cargarla y redesplegar. El resto del sistema anda igual sin ella. |
| Entra y vuelve a la pantalla de ingreso, o rebota a `/salir`. | Perfil inexistente o desactivado. | Capítulo 12. |
| **Pantallas vacías** (sin sabores, sin ventas) sin ningún error. | Una consulta falla y la pantalla muestra lista vacía: migración sin aplicar o clave incorrecta. | Revisar los *Logs* de Vercel y las migraciones aplicadas. |
| `permission denied` / código `42501`. | Falta el `grant` o la política en una tabla o función nueva. | Revisar la migración: cada tabla lleva `enable row level security`, `grant` a `authenticated`, `revoke` a `anon` y su política. |
| `relation … does not exist` / `Could not find the function …`. | Migración sin aplicar, o la API no recargó el esquema. | Aplicar la migración, y correr `notify pgrst, 'reload schema';`. |
| El sidebar dice "Caja abierta" y Ventas dice "cerrada" (o al revés). | Pantalla desactualizada (el menú vive en el layout). | **F5**. Si persiste, mirar el estado real en *Caja* y en la consulta de turnos (capítulo 14). |
| "**Ya hay una caja abierta**" al abrir. | Quedó un turno sin cerrar. | Cerrarlo desde *Caja → Cerrar caja*. Si es de pruebas, nivel 1 del capítulo 11. |
| `npm run test:rls` falla con "**Hay una caja abierta**". | Es una protección del test de caja, que abre y cierra turnos. | No correrlos contra una base en uso. Cerrar la caja o usar el proyecto de pruebas. |
| `test:rls`: falla un solo test por un **texto de error** distinto. | Cambió el mensaje de una función y el test espera el viejo. | Actualizar el texto que espera el test (ya pasó con `registrar_venta`). |
| Un **código de barras dice "no está cargado"**. | Etiqueta de un balde o pote que ya no existe (borrado, o de antes de limpiar la base). | Reimprimir la etiqueta correcta. |
| **Un Excel no baja**, o da 403. | La descarga es solo del dueño. | Entrar con un usuario dueño. Si da 500, mirar el log (`Excel de …`) en Vercel. |
| El **Excel de ventas** parece incompleto. | No lo es: trae todas las del período. Revisar el filtro de fechas y de medio de pago de la pantalla. | Ajustar el filtro y volver a bajar. |
| **Imprimir etiquetas** saca todo el menú. | La hoja de etiquetas no está en pantalla (el CSS de impresión deja solo `#hoja-de-etiquetas`). | Estar en una pestaña con hoja (Códigos) o en Potes con potes tildados. Usar Chrome. |
| Las **horas de las ventas** salen corridas. | Zona horaria incorrecta. | Revisar `ZONA_HORARIA` en `src/config/comercio.ts`. |
| **Un deploy falla** en Vercel pero anda en tu máquina. | Versión de Node distinta, o tipos de Next sin generar. | Fijar Node 22 en Vercel. Reproducir con `npm ci && npm run verificar && npm run build`. |
| El proyecto de Supabase **no responde**. | Plan gratuito: se pausó por inactividad. | Reanudarlo desde el panel de Supabase; la primera consulta puede tardar. Es una razón más para un plan de pago. |
| Dos personas cobran **el mismo pote** a la vez. | No pasa: solo una venta lo toma. La otra recibe "ese pote ya no está en el freezer". | Nada que hacer. |
| El cajero toca **Cobrar dos veces**. | No duplica: la venta entra una sola vez (clave de cobro). | Nada que hacer. |

### Dónde mirar cuando algo falla

1. **Vercel → Logs**: errores del servidor (acciones, Excel, páginas).
2. **Supabase → Logs → Postgres** (y *API*): errores de la base, políticas, funciones.
3. **El mensaje en pantalla**: casi siempre está escrito para decir qué paso falta.
4. La **bitácora** (`BITACORA.md`) y el **roadmap** (`ROADMAP.md`) dicen en qué estado quedó cada cosa y por qué.

---

## 14. Consultas SQL útiles

Todas se corren en el **SQL Editor**. Las de lectura son seguras.

### ¿Qué migraciones están aplicadas?

No hay una tabla de control (se aplican a mano), así que se mira qué existe. Cada fila tiene que dar `true`:

```sql
select 'permisos (20261003110000)' as migracion,
       exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'perfiles' and column_name = 'permisos') as aplicada
union all
select 'clave de cobro (20261003100000)',
       exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'ventas' and column_name = 'clave_idempotencia')
union all
select 'ciclo del balde (20261003120000)',
       exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'venta_items' and column_name = 'balde_id')
union all
select 'potes (20261004100000)',
       exists (select 1 from information_schema.tables
               where table_schema = 'public' and table_name = 'potes');
```

### ¿Hay una caja abierta?

```sql
select id, abierto_por, abierto_en from public.turnos_caja where cerrado_en is null;
```

### ¿Quién puede entrar y con qué permisos?

```sql
select usuario, nombre, rol, activo, permisos from public.perfiles order by usuario;
```

### ¿Cuánto hay de cada cosa? (control de volumen)

```sql
select 'ventas' as tabla, count(*) from public.ventas
union all select 'baldes', count(*) from public.baldes
union all select 'potes', count(*) from public.potes
union all select 'insumos', count(*) from public.insumos
union all select 'usuarios', count(*) from public.perfiles;
```

### Recargar el esquema de la API

```sql
notify pgrst, 'reload schema';
```

### Dar o quitar permisos de un colaborador a mano

```sql
-- todos
update public.perfiles set permisos = array['anular_ventas','movimientos_caja','cargar_inventario'] where usuario = 'ana';
-- ninguno (solo vender)
update public.perfiles set permisos = '{}' where usuario = 'ana';
```

### Ver el stock de insumos con problemas

```sql
select nombre, cantidad, minimo from public.insumos
where activo and cantidad <= minimo order by nombre;
```

---

## 15. Ajustes que se hacen en el código

Lo que cambia con el comercio vive en pocos archivos:

| Qué | Dónde |
| --- | --- |
| **Nombre del comercio** (hoy "Goro", provisorio) y su leyenda | `src/config/comercio.ts` → `NOMBRE_COMERCIO` y `RUBRO_COMERCIO`. De ahí salen el menú, el ingreso, el título, la descripción del sitio y el nombre de los Excel. Además, el bloque `COMERCIO` al final de `docs/guia-de-uso.html`. |
| **Zona horaria** | `src/config/comercio.ts` → `ZONA_HORARIA` |
| **Dominio de los correos internos** | `src/config/comercio.ts`. **No lo cambies una vez que hay usuarios.** |
| **Colores y tipografías** | `src/estilos/tema.css` (único archivo con colores) |
| **Fondo del ingreso** | `public/fondo-login-escritorio.svg` |
| **Módulos del menú** y quién los ve | `src/config/navegacion.ts` |
| **Permisos por acción** | `src/modulos/auth/permisos.ts` **y** el `check` de `perfiles.permisos` **y** la función de Postgres que lo exige |

Las reglas del código (idioma, tamaño de archivos, colores, reglas de base de datos) están en `AGENTS.md` y se repasan **antes** de
escribir. El plan y lo que falta está en `ROADMAP.md`; la historia de cada decisión, en `BITACORA.md`.

### Lo que sigue pendiente del producto

- La **pistola** de códigos de barras: prueba de lectura y etiqueta aguantando 24 horas en el freezer (pasos 0.2 y 0.3 del roadmap).
- Decidir la **impresora de etiquetas** (hoy se imprime en hoja A4).
- Cosas fuera de alcance por ahora: clientes y cuenta corriente, delivery, promos, facturación electrónica, tickets impresos.

---

*Guía de traspaso del sistema Goro. Si algo de acá no coincide con lo que ves en Supabase, Vercel o GitHub, probablemente cambió su
panel: la intención de cada paso se mantiene, el nombre del menú puede variar.*
