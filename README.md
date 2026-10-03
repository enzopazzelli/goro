# Goro — sistema de gestión para heladería

Sistema de gestión de una heladería artesanal de **un solo local**: caja, ventas, inventario por balde,
potes armados con código de barras, usuarios con permisos y reportes. "Goro" es el nombre interno del
proyecto (y el dueño); el nombre del comercio que se muestra se define en un solo lugar (ver más abajo).

**Stack:** Next.js (App Router) + TypeScript + Supabase (Postgres, Auth y RLS). Se publica en Vercel.

## Empezar

```bash
npm install
cp .env.local.example .env.local   # completar con las claves de Supabase (ver abajo)
npm run dev                        # http://localhost:3000
npm run verificar                  # formato + lint + typecheck + tests unitarios (lo mismo que el CI)
```

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo. |
| `npm run verificar` | Formato, lint, typecheck y tests unitarios. **Correrlo antes de dar algo por terminado.** |
| `npm run build` | Compila como en producción. |
| `npm run test:unit` | Solo los tests unitarios. |
| `npm run test:rls` | Tests de seguridad contra una base **real**. **Solo contra un proyecto de pruebas**, nunca producción. |
| `npm run formato:arreglar` | Aplica el formato de Prettier. |

### Variables de entorno

Tres, en `.env.local` (no se versiona) y en el hosting. Detalle en `docs/guia-de-traspaso.md`.

| Variable | Qué es |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | La dirección del proyecto de Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | La clave pública. |
| `SUPABASE_SERVICE_ROLE_KEY` | La clave de servicio: **secreta**, solo servidor. |

## Dónde está cada cosa

```
src/
  app/          rutas (App Router): lo mínimo, y a delegar
  componentes/  piezas visuales compartidas
  config/       lo que cambia con el comercio: nombre, zona horaria, menú
  estilos/      tema.css: el ÚNICO archivo con colores
  lib/          utilidades puras, clientes de Supabase, Excel, códigos de barras
  modulos/      un módulo por carpeta: auth, caja, inventario, panel, potes, productos, ventas
supabase/
  migrations/   el esquema de la base, en orden de fecha (no se editan una vez aplicadas)
  *.sql         scripts sueltos: carga de productos, limpiar datos de prueba, reiniciar la base
docs/           guías (ver abajo)
```

Las reglas del código (idioma, tamaño de archivos, colores, reglas de base de datos) están en
**`AGENTS.md`** y se repasan **antes** de escribir, no después.

## Documentación

| Archivo | Para quién | Qué es |
| --- | --- | --- |
| `docs/guia-de-uso.html` | Quien usa el sistema | Guía completa con ejemplos: caja, ventas, inventario, potes, usuarios. Un solo HTML, se abre con doble clic. |
| `docs/guia-de-traspaso.md` / `.html` | Quien lo mantiene | Entregar GitHub, Supabase y Vercel; backups; vaciar la base; recuperar accesos; problemas. |
| `ROADMAP.md` | El equipo | El plan por fases y qué falta. |
| `BITACORA.md` | El equipo | Qué se hizo y por qué, sesión por sesión. **Leer las últimas entradas al empezar.** |
| `supabase/README.md` | Quien toca la base | Cómo aplicar las migraciones, el primer dueño, limpiar y reiniciar. |
| `AGENTS.md` | Quien programa | Convenciones del proyecto. |
| `index.html` | — | El mockup de venta. **Congelado**: sirvió para vender el proyecto y no se toca. |

## Ponerle nombre al comercio

El nombre que se muestra todavía es provisorio. Todo lo que cambia con el nombre está en
**`src/config/comercio.ts`** (`NOMBRE_COMERCIO` y `RUBRO_COMERCIO`): de ahí salen el menú, el ingreso, el título
de la pestaña, la descripción del sitio y el nombre de los archivos de Excel. En `docs/guia-de-uso.html` hay un
bloque `COMERCIO` al final del archivo. El mismo comentario de `comercio.ts` lista lo que **no** se toca a
propósito (el dominio de los correos internos y el prefijo de los códigos de barras).

## Estado

Hecho: núcleo (ingreso y roles), inventario, catálogo, ventas, caja, historial, usuarios, panel, permisos por
acción, ciclo del balde, Excel, potes armados, lector de códigos y etiquetas.

Falta: la prueba física de la pistola de códigos y de la etiqueta en el freezer, y decidir la impresora de
etiquetas. El detalle está en `ROADMAP.md`.
