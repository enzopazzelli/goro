# Productos y envases — rediseño

Fecha: 2026-09-29 · Reemplaza las partes del [diseño inicial](2026-09-29-productos-por-unidad-design.md) que se
contradicen con lo de acá (la tabla `formato_insumos` y la marca `es_componente`). Nació de probar el primer
diseño en pantalla.

## Qué se corrigió y por qué

| Problema visto en pantalla | Decisión |
|---|---|
| "Cucuruchón dulce consume Cono cucuruchón dulce × 1" no dice nada nuevo | No hay lista de consumos: el formato tiene, a lo sumo, **un envase propio** con su stock |
| Los productos de freezer aparecían entre los insumos | Pestaña **Productos** aparte en Stock |
| No había dónde poner el precio, y el precio de venta terminaba en "Costo" | **Costo por unidad** (lo que paga Goro) en el insumo, **precio de venta** en cada presentación; ambos rotulados |
| Filas con cuatro números sin título | Todos los campos llevan título; los formatos dicen "Gramos de helado", "Cantidad de sabores", "Precio con helado" |
| Nada decía "×12" | Las presentaciones se rotulan "Docena ×12" en Stock, mostrador y ticket |

## Modelo

`insumos.tipo` = `insumo` · `producto` · `envase` (no se edita después de creado).
`insumos.formato_id` (único) solo para envases; un check ata el tipo a la columna.
`presentaciones_insumo`: unidad ×1 y docena ×12 con su precio, inactivas hasta tener precio.
Vender un formato con helado descuenta 1 unidad de su envase. "Sin helado" es vender el envase como producto.

Crear un producto o un envase es una **función de base de datos** (`crear_producto`, `crear_envase_de_formato`):
insumo + código + presentaciones + stock inicial en una sola transacción.

## Migraciones

Renovadas por completo, una por módulo (núcleo, catálogo, inventario, productos, ventas), sin `alter` apilados ni
arreglos posteriores. Se validaron en un Postgres local (PGlite) antes de aplicarlas: mismo catálogo que la cadena
anterior salvo el rediseño, y escenarios de venta, anulación, permisos y reinicio.
