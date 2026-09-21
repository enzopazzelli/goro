-- ============================================================================
-- Siembra de ejemplo — NO es una migración versionada, es un script aparte
-- que se corre una sola vez a mano si se quiere partir con datos de
-- ejemplo en vez de un sistema vacío. Dataset tomado del mockup
-- (index.html), con los mismos colores reales por sabor.
--
-- Ahora que Sabores e Insumos se pueden borrar y editar desde la UI, lo que
-- Goro no use de acá se saca o se ajusta directamente desde Inventario —
-- no hace falta editar este script para eso.
-- ============================================================================

insert into public.sabores (nombre, color) values
  ('Dulce de leche',          '#C08A45'),
  ('Chocolate amargo',        '#4A2C1A'),
  ('Chocolate suizo',         '#7A4B2B'),
  ('Sambayón',                '#E8C86A'),
  ('Vainilla',                '#F2E6C8'),
  ('Pistacho',                '#8FAE5B'),
  ('Frutilla a la crema',     '#E1798A'),
  ('Limón',                   '#EFE28A'),
  ('Frambuesa',               '#B33A5B'),
  ('Maracuyá',                '#E7B02F');

-- Los códigos se escriben a mano (no vía siguiente_numero_insumo, que no
-- corre en un script de siembra) — por eso el setval de más abajo, para
-- que el próximo insumo dado de alta desde la UI no repita un código.
insert into public.insumos (nombre, codigo, unidad, minimo, costo) values
  ('Cucuruchos',         'GA0000001', 'u',  200,  190),
  ('Vasitos 160g',       'GA0000002', 'u',  150,  150),
  ('Potes 1/4 kg',       'GA0000003', 'u',  100,  320),
  ('Potes 1/2 kg',       'GA0000004', 'u',  100,  420),
  ('Potes 1 kg',         'GA0000005', 'u',  80,   560),
  ('Cucharitas',         'GA0000006', 'u',  800,  22),
  ('Salsa de chocolate', 'GA0000007', 'kg', 2,    6800),
  ('Servilletas',        'GA0000008', 'u',  1000, 8);

select setval('public.insumos_secuencia', 8, true);

insert into public.formatos (nombre, gramos, cantidad_sabores, precio) values
  ('Cucurucho', 120,  1, 2200),
  ('Doble',     180,  2, 2900),
  ('Vasito',    160,  2, 2700),
  ('1/4 kilo',  250,  2, 6500),
  ('1/2 kilo',  500,  3, 11800),
  ('1 kilo',    1000, 4, 21000);
