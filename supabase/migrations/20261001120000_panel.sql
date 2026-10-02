-- ============================================================================
-- Panel: lo vendido, las ventas por hora y los kilos por sabor (Fase 7).
-- ============================================================================
-- Nada de esto guarda datos nuevos: las tres funciones leen lo que ya está en
-- ventas y en movimientos_balde. Suman del lado del servidor y no en el
-- navegador, porque el total de un mes son miles de filas que no tienen por
-- qué viajar para convertirse en cuatro números.
--
-- Las tres son `stable` y `security invoker` A PROPÓSITO: no llevan
-- `definer`. Así cada una ve exactamente lo que la RLS le deja ver a quien
-- llama, sin un `if` de rol que haya que mantener en paralelo con las
-- políticas. Nada de lo que devuelven es nuevo para un colaborador: ya ve cada
-- venta en el Historial.
-- ============================================================================

-- El Historial y el Panel filtran por fecha en cada consulta, y hasta ahora
-- `ventas` solo tenía índice por turno.
create index ventas_creado_en_idx on public.ventas (creado_en desc);

-- ----------------------------------------------------------------------------
-- Cuánto se vendió, por medio de pago. Las anuladas no entran: lo anulado no
-- se vendió, y es lo mismo que hace el resumen del turno.
-- ----------------------------------------------------------------------------
create function public.ventas_del_periodo(p_desde timestamptz, p_hasta timestamptz)
returns table (medio_pago public.medio_pago, cantidad integer, total integer)
language sql
stable
set search_path = public, pg_temp
as $$
  select v.medio_pago, count(*)::integer, sum(v.total)::integer
  from public.ventas v
  where v.estado = 'cobrada' and v.creado_en >= p_desde and v.creado_en < p_hasta
  group by v.medio_pago;
$$;

revoke execute on function public.ventas_del_periodo(timestamptz, timestamptz) from public, anon;
grant execute on function public.ventas_del_periodo(timestamptz, timestamptz) to authenticated;

-- ----------------------------------------------------------------------------
-- Las ventas por hora, en la hora DEL LOCAL: el servidor corre en UTC, y un
-- gráfico corrido tres horas manda personal al turno equivocado.
--
-- La zona entra por parámetro y no escrita acá: la define
-- `src/config/comercio.ts`, y dos lugares que la definan es uno de más.
-- ----------------------------------------------------------------------------
create function public.ventas_por_hora(p_desde timestamptz, p_hasta timestamptz, p_zona text)
returns table (hora integer, cantidad integer, total integer)
language sql
stable
set search_path = public, pg_temp
as $$
  select
    extract(hour from v.creado_en at time zone p_zona)::integer as hora,
    count(*)::integer,
    sum(v.total)::integer
  from public.ventas v
  where v.estado = 'cobrada' and v.creado_en >= p_desde and v.creado_en < p_hasta
  group by 1
  order by 1;
$$;

revoke execute on function public.ventas_por_hora(timestamptz, timestamptz, text)
  from public, anon;
grant execute on function public.ventas_por_hora(timestamptz, timestamptz, text) to authenticated;

-- ----------------------------------------------------------------------------
-- Los kilos que salieron de los baldes, por sabor. Es lo que sirve para
-- comprar: cuánta Frutilla se fue, no cuánta plata dejó.
--
-- Se suman los movimientos de los items de cada venta y se agrupa por SABOR,
-- no por balde: dos baldes del mismo sabor son el mismo sabor, y una
-- corrección deja una fila positiva en el balde viejo y una negativa en el
-- nuevo. El neto por sabor es lo único que sobrevive a esa corrección.
--
-- El signo se da vuelta porque una venta descuenta: en el balde es -0,25 kg y
-- en el ranking son 0,25 kg vendidos. El `having` saca los sabores que
-- quedaron en cero porque se corrigieron enteros.
-- ----------------------------------------------------------------------------
create function public.kilos_por_sabor(p_desde timestamptz, p_hasta timestamptz)
returns table (sabor_id integer, sabor_nombre text, kg numeric)
language sql
stable
set search_path = public, pg_temp
as $$
  select b.sabor_id, s.nombre, (0 - sum(mb.kg))::numeric
  from public.movimientos_balde mb
  join public.venta_items vi on vi.id = mb.venta_item_id
  join public.ventas v on v.id = vi.venta_id
  join public.baldes b on b.id = mb.balde_id
  join public.sabores s on s.id = b.sabor_id
  where v.estado = 'cobrada' and v.creado_en >= p_desde and v.creado_en < p_hasta
  group by b.sabor_id, s.nombre
  having sum(mb.kg) < 0
  order by 3 desc, 2;
$$;

revoke execute on function public.kilos_por_sabor(timestamptz, timestamptz) from public, anon;
grant execute on function public.kilos_por_sabor(timestamptz, timestamptz) to authenticated;
