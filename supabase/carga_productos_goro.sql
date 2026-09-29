-- ============================================================================
-- Carga inicial de las dos listas que mandó Goro (2026-09-29).
-- NO es una migración versionada: es un script aparte que se corre una vez a
-- mano, como seed_ejemplo.sql. Se puede volver a correr sin duplicar nada.
--
-- Todo entra INACTIVO y SIN PRECIO: Goro completa los precios después desde
-- Inventario. Los mínimos y costos quedan en 0 por el mismo motivo.
--
-- Supuestos para confirmar con Goro (se corrigen desde Stock, sin código):
--  * hay cinco conos distintos: simple, doble, canasta, dulce y cucuruchón;
--  * el vasito simple (1 bocha) no consume ningún cono.
-- Bocha = 65 g: los dobles pesan 130 g y llevan 2 sabores.
-- ============================================================================

-- Mismo cálculo que digitoVerificador() en src/lib/codigos/codigo.ts: tipo A
-- pesa 1, y las posiciones pares (contando el tipo como la 0) pesan 3.
create function pg_temp.codigo_articulo(p_numero integer)
returns text
language plpgsql
as $$
declare
  v_secuencia text := lpad(p_numero::text, 6, '0');
  v_suma integer := 3;  -- el tipo (peso 1) en posición 0, que pesa 3
  i integer;
begin
  for i in 1..6 loop
    v_suma := v_suma + substr(v_secuencia, i, 1)::integer * case when i % 2 = 1 then 1 else 3 end;
  end loop;
  return 'GA' || v_secuencia || ((10 - v_suma % 10) % 10)::text;
end;
$$;

-- Comprobación: tiene que dar GA0000014, GA0000120, GA0003459.
select pg_temp.codigo_articulo(1), pg_temp.codigo_articulo(12), pg_temp.codigo_articulo(345);

-- Insumos: cinco conos y los productos de reventa. El código se genera solo
-- para los que faltan, así volver a correr esto no gasta números de la secuencia.
insert into public.insumos (nombre, codigo, unidad, minimo, costo)
select v.nombre, pg_temp.codigo_articulo(public.siguiente_numero_insumo()), 'u', 0, 0
from (values
  ('Cono simple'),
  ('Cono doble'),
  ('Canasta'),
  ('Cono dulce'),
  ('Cono cucuruchón dulce'),
  ('Bombón'),
  ('Palito'),
  ('Sándwich'),
  ('Cono bañado'),
  ('Cremita'),
  ('Vasito 100 g')
) as v(nombre)
where not exists (select 1 from public.insumos i where i.nombre = v.nombre);

-- Presentaciones: x1 y x12 de cada uno, inactivas y a $0 hasta que Goro ponga precio.
insert into public.presentaciones_insumo (insumo_id, nombre, unidades)
select i.id, p.nombre, p.unidades
from public.insumos i
cross join (values ('Unidad', 1), ('Docena', 12)) as p(nombre, unidades)
where i.nombre in (
  'Cono simple', 'Cono doble', 'Canasta', 'Cono dulce', 'Cono cucuruchón dulce',
  'Bombón', 'Palito', 'Sándwich', 'Cono bañado', 'Cremita', 'Vasito 100 g'
)
on conflict (insumo_id, unidades) do nothing;

-- Formatos de la lista 2. Inactivos y a $0.
insert into public.formatos (nombre, gramos, cantidad_sabores, precio, activo) values
  ('Cucurucho simple',   65,  1, 0, false),
  ('Cucurucho doble',    130, 2, 0, false),
  ('Canasta doble',      130, 2, 0, false),
  ('Cucurucho dulce',    130, 2, 0, false),
  ('Vasito simple',      65,  1, 0, false),
  ('Cucuruchón dulce',   130, 2, 0, false)
on conflict (nombre) do nothing;

-- Qué cono se lleva cada formato. El vasito simple no consume nada.
insert into public.formato_insumos (formato_id, insumo_id, cantidad)
select f.id, i.id, 1
from (values
  ('Cucurucho simple', 'Cono simple'),
  ('Cucurucho doble',  'Cono doble'),
  ('Canasta doble',    'Canasta'),
  ('Cucurucho dulce',  'Cono dulce'),
  ('Cucuruchón dulce', 'Cono cucuruchón dulce')
) as c(formato, insumo)
join public.formatos f on f.nombre = c.formato
join public.insumos i on i.nombre = c.insumo
on conflict (formato_id, insumo_id) do nothing;

-- Para mirar el resultado: 11 insumos nuevos, 22 presentaciones, 6 formatos, 5 consumos.
select i.codigo, i.nombre, count(p.id) as presentaciones
from public.insumos i
left join public.presentaciones_insumo p on p.insumo_id = i.id
where i.nombre in (
  'Cono simple', 'Cono doble', 'Canasta', 'Cono dulce', 'Cono cucuruchón dulce',
  'Bombón', 'Palito', 'Sándwich', 'Cono bañado', 'Cremita', 'Vasito 100 g'
)
group by i.codigo, i.nombre
order by i.codigo;
