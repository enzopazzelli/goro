-- ============================================================================
-- Carga inicial de las dos listas que mandó Goro (2026-09-29).
-- NO es una migración versionada: es un script aparte que se corre una vez a
-- mano, como seed_ejemplo.sql. Se puede volver a correr sin duplicar nada.
-- Requiere las cinco migraciones aplicadas.
--
-- Todo entra INACTIVO y SIN PRECIO: Goro completa los precios después desde
-- Inventario. Los costos quedan en 0 por el mismo motivo.
--
-- Supuestos para confirmar con Goro (se corrigen desde Inventario, sin código):
--  * los seis formatos de la lista 2 llevan envase propio (cono, canasta o
--    vasito) que se vende suelto "sin helado": Goro pidió ese precio para los
--    seis;
--  * bocha = 65 g: los dobles pesan 130 g y llevan 2 sabores.
-- ============================================================================

-- Productos de freezer (lista 1). crear_articulo les pone su código y sus dos
-- presentaciones (Unidad ×1 y Docena ×12), inactivas y a $0. Solo se llama
-- para los que faltan, así volver a correr esto no gasta números de la
-- secuencia de códigos.
select public.crear_articulo(v.nombre, 'producto', 0)
from (values
  ('Bombón'),
  ('Palito'),
  ('Sándwich'),
  ('Cono bañado'),
  ('Cremita'),
  ('Vasito 100 g')
) as v(nombre)
where not exists (select 1 from public.insumos i where i.nombre = v.nombre);

-- Formatos de la lista 2. Inactivos y a $0.
insert into public.formatos (nombre, gramos, cantidad_sabores, precio, activo) values
  ('Cucurucho simple',  65,  1, 0, false),
  ('Cucurucho doble',   130, 2, 0, false),
  ('Canasta doble',     130, 2, 0, false),
  ('Cucurucho dulce',   130, 2, 0, false),
  ('Vasito simple',     65,  1, 0, false),
  ('Cucuruchón dulce',  130, 2, 0, false)
on conflict (nombre) do nothing;

-- El envase de cada uno: "Cucurucho doble (sin helado)", con su stock propio y
-- sus presentaciones. Al vender el formato con helado se descuenta 1 envase.
select public.crear_articulo(f.nombre || ' (sin helado)', 'envase', 0, f.id)
from public.formatos f
where f.nombre in (
  'Cucurucho simple', 'Cucurucho doble', 'Canasta doble',
  'Cucurucho dulce', 'Vasito simple', 'Cucuruchón dulce'
)
and not exists (select 1 from public.insumos i where i.formato_id = f.id);

-- Para mirar el resultado: 6 productos, 6 envases (con 2 presentaciones cada uno).
select i.codigo, i.nombre, i.tipo, count(p.id) as presentaciones
from public.insumos i
left join public.presentaciones_insumo p on p.insumo_id = i.id
where i.tipo in ('producto', 'envase')
group by i.codigo, i.nombre, i.tipo
order by i.codigo;
