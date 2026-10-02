-- ============================================================================
-- Panel, segunda vuelta: por día, por artículo y el costo de lo vendido.
-- ============================================================================
-- Mismo criterio que la migración del Panel: funciones `stable` y `security
-- invoker`, sin `definer`, así cada una ve lo que la RLS le deja ver a quien
-- llama. Ninguna guarda nada.
--
-- La comparación con el período anterior NO necesita función nueva: es
-- `ventas_del_periodo` otra vez, con el rango corrido. Se arma del lado del
-- servidor de Next (`lib/periodos.ts`, `periodoAnterior`).
-- ============================================================================

-- `kilos_por_sabor` y `costo_de_lo_vendido` joinean por esta columna y no había
-- índice: era un scan de todo el ledger de baldes por cada consulta del Panel.
create index movimientos_balde_venta_item_idx on public.movimientos_balde (venta_item_id);

-- ----------------------------------------------------------------------------
-- Una fila por día DEL LOCAL. De acá salen dos indicadores sin pedir otra
-- consulta: lo que rinde cada día de la semana, y el promedio de un día
-- abierto. Agruparlos es cuenta de pantalla, no de base.
-- ----------------------------------------------------------------------------
create function public.ventas_por_dia(p_desde timestamptz, p_hasta timestamptz, p_zona text)
returns table (dia date, cantidad integer, total integer)
language sql
stable
set search_path = public, pg_temp
as $$
  select
    (v.creado_en at time zone p_zona)::date as dia,
    count(*)::integer,
    sum(v.total)::integer
  from public.ventas v
  where v.estado = 'cobrada' and v.creado_en >= p_desde and v.creado_en < p_hasta
  group by 1
  order by 1;
$$;

revoke execute on function public.ventas_por_dia(timestamptz, timestamptz, text) from public, anon;
grant execute on function public.ventas_por_dia(timestamptz, timestamptz, text) to authenticated;

-- ----------------------------------------------------------------------------
-- Qué se vendió, en unidades y en plata. Se agrupa por el ID del formato o de
-- la presentación, no por su nombre: si a un formato lo renombraron en el
-- medio del período, sigue siendo el mismo artículo.
--
-- Devuelve los pedazos del nombre y no el nombre armado a propósito: lo compone
-- `lib/nombreItem.ts`, que es el mismo que ve el cajero en el carrito. Armarlo
-- también acá sería tener el nombre en dos lugares.
-- ----------------------------------------------------------------------------
create function public.unidades_por_articulo(p_desde timestamptz, p_hasta timestamptz)
returns table (
  formato_nombre text,
  presentacion_nombre text,
  presentacion_unidades integer,
  insumo_nombre text,
  unidades integer,
  total integer
)
language sql
stable
set search_path = public, pg_temp
as $$
  select f.nombre, p.nombre, p.unidades, i.nombre, count(*)::integer, sum(vi.precio)::integer
  from public.venta_items vi
  join public.ventas v on v.id = vi.venta_id
  left join public.formatos f on f.id = vi.formato_id
  left join public.presentaciones_insumo p on p.id = vi.presentacion_id
  left join public.insumos i on i.id = p.insumo_id
  where v.estado = 'cobrada' and v.creado_en >= p_desde and v.creado_en < p_hasta
  group by vi.formato_id, vi.presentacion_id, f.nombre, p.nombre, p.unidades, i.nombre
  order by 5 desc, 6 desc;
$$;

revoke execute on function public.unidades_por_articulo(timestamptz, timestamptz)
  from public, anon;
grant execute on function public.unidades_por_articulo(timestamptz, timestamptz) to authenticated;

-- ----------------------------------------------------------------------------
-- Lo que costó lo que salió, para el margen BRUTO. Dos números separados
-- porque son dos naturalezas: el helado sale de los baldes y los envases y
-- productos del ledger de insumos.
--
-- El helado se valúa al costo del balde del que de verdad salió
-- (`costo / kg_inicial`), no a un promedio: dos baldes del mismo sabor pueden
-- haber costado distinto. Eso hace que una corrección de sabor se cobre bien
-- sola — devuelve kilos al balde viejo a su costo y los saca del nuevo al suyo.
--
-- `costo_envase` NO entra: el balde vuelve al proveedor. Recién cuesta un
-- envase el día que se vende en vez de canjearse, y eso es la Fase 9.
--
-- El margen no descuenta sueldos, alquiler ni los gastos de caja: esos están en
-- Caja, y mezclarlos daría un número que no es ni una cosa ni la otra.
-- ----------------------------------------------------------------------------
create function public.costo_de_lo_vendido(p_desde timestamptz, p_hasta timestamptz)
returns table (costo_helado numeric, costo_insumos numeric)
language sql
stable
set search_path = public, pg_temp
as $$
  select
    coalesce((
      select sum((0 - mb.kg) * (b.costo::numeric / b.kg_inicial))
      from public.movimientos_balde mb
      join public.venta_items vi on vi.id = mb.venta_item_id
      join public.ventas v on v.id = vi.venta_id
      join public.baldes b on b.id = mb.balde_id
      where v.estado = 'cobrada' and v.creado_en >= p_desde and v.creado_en < p_hasta
    ), 0),
    coalesce((
      select sum((0 - mi.cantidad) * i.costo)
      from public.movimientos_insumo mi
      join public.venta_items vi on vi.id = mi.venta_item_id
      join public.ventas v on v.id = vi.venta_id
      join public.insumos i on i.id = mi.insumo_id
      where v.estado = 'cobrada' and v.creado_en >= p_desde and v.creado_en < p_hasta
    ), 0);
$$;

revoke execute on function public.costo_de_lo_vendido(timestamptz, timestamptz) from public, anon;
grant execute on function public.costo_de_lo_vendido(timestamptz, timestamptz) to authenticated;
