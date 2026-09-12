<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Convenciones — sistema Goro

Sistema de gestión para una heladería artesanal de **un solo local**.
El plan está en `ROADMAP.md`; el mockup de venta, en `index.html` (HTML plano,
no es código del sistema y no se toca con estas reglas).

Antes de escribir una función nueva, repasar `../lecciones-ciro-polirrubro.md`.
Los seis hallazgos de ahí son un checklist previo, no una auditoría posterior.

## Idioma

Todo en español: carpetas, archivos, funciones, variables, columnas, tablas y
mensajes. Los comentarios explican el **por qué**, no el qué — el qué ya está
en el código.

## Estructura

```
src/
  app/         rutas (App Router). Lo mínimo: layout, página, y a delegar.
  componentes/ piezas visuales compartidas por más de un módulo
  config/      constantes del comercio
  estilos/     tema.css — el ÚNICO archivo con colores literales
  lib/         utilidades puras y clientes de Supabase
  modulos/<n>/ un módulo por carpeta:
                 componentes/   UI del módulo
                 consultas/     acceso a datos y lógica
                 tipos.ts       tipos del módulo
                 rls.test.ts    qué NO puede hacer cada rol
supabase/migrations/  YYYYMMDDHHMMSS_descripcion.sql
```

Un módulo no importa de las `consultas/` de otro. Si dos módulos necesitan lo
mismo, sube a `lib/`.

## Tamaño del código

**200 líneas por archivo, 100 por función.** Lo corta ESLint, no el criterio
de nadie. Los comentarios y las líneas en blanco no cuentan.

En el sistema anterior el panel de ventas llegó a 908 líneas porque nada lo
impedía. Cuando un archivo toca el techo, la respuesta es partirlo en piezas
con nombre, no subir el límite.

## Color

`src/estilos/tema.css` es el único lugar con un `#hex`. Ni un color literal ni
una clase de color de librería fuera de ahí. Si falta un color, se agrega un
token nombrado **por su rol** (`--alerta`), nunca por su color (`--rojo`).

## Base de datos

Cuatro reglas que salen de errores reales, no de teoría:

1. **Una operación de negocio = una transacción del lado del servidor.**
   Registrar una venta toca kilos, insumos, caja y cuenta corriente. Va en una
   función de Postgres, nunca en varios `update` sueltos desde el navegador.
2. **El stock nunca se pisa con un número absoluto**: siempre se suma un
   movimiento. Es lo que permite reconstruir el día que algo no cierra.
3. **Todo invariante de "solo puede haber uno" vive en un índice único**
   (parcial si hace falta), nunca en un `select` previo: dos pedidos
   simultáneos pasan los dos ese chequeo.
4. **Toda validación de negocio existe también como `check` en la columna.**
   La del formulario es comodidad de UX, no una barrera.

Y en cualquier función `security definer`, comparar roles con
`coalesce(auth_rol() = 'duenio', false)`. Un `NULL` pelado en un `if` de
PL/pgSQL **no** dispara la excepción, al revés que en una política RLS.

## Exportar a Excel

Todo texto cargado por una persona (nombre de sabor, detalle de un gasto, nota)
se sanea antes de escribir la celda: si empieza con `=`, `+`, `-` o `@`, se le
antepone una comilla. Si no, Excel lo interpreta como fórmula al abrir el
archivo — es CSV injection, categoría documentada por OWASP.

## Antes de dar algo por terminado

```
npm run verificar
```

Corre formato, lint, typecheck y tests unitarios — lo mismo que el CI, en un
comando. Si eso pasa, el push no debería sorprender a nadie.
