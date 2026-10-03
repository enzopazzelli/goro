-- ============================================================================
-- Limpiar los datos de prueba: deja la base lista para usar de verdad.
-- ============================================================================
-- NO es una migración: es un script aparte que se corre a mano en el SQL Editor,
-- las veces que haga falta (se puede repetir sin problema).
--
-- ES DESTRUCTIVO Y NO SE PUEDE DESHACER. Se usa al terminar de probar, antes de
-- la primera venta real.
--
-- QUÉ SE BORRA (todo lo que se genera trabajando):
--   * ventas y sus renglones
--   * la caja: turnos, arqueos y todos los movimientos (apertura, gastos, retiros…)
--   * los baldes, con todos sus movimientos de kilos
--   * los potes armados
--   * el stock de insumos, productos y envases: vuelve a 0 (y su historial)
--
-- QUÉ SE CONSERVA (lo que se carga una vez y se mantiene):
--   * los usuarios y sus permisos
--   * los sabores, con su color, su mínimo y su precio de balde
--   * los formatos, con sus precios
--   * los insumos, productos y envases, con sus códigos, costos y presentaciones
--     (Unidad, Docena…) y los precios que ya se les puso
--   * la configuración del comercio (mínimo de alerta, precio del balde entero)
--
-- Después de correrlo hay que:
--   1. Abrir la caja (Caja → Abrir caja).
--   2. Cargar el stock real: baldes en "Balde nuevo" y mercadería en
--      "Recibir mercadería" o "Cargar" de cada producto.
--
-- Los números empiezan de nuevo: la primera venta es la #1, y el primer balde y
-- el primer pote vuelven a ser el 1 de su serie. Los códigos de los insumos NO se
-- reinician (siguen existiendo los mismos, y las etiquetas ya impresas valen).
-- Las etiquetas de baldes y potes impresas ANTES de limpiar dejan de servir:
-- esos códigos se vuelven a generar y se imprimen de nuevo.
--
-- OJO: si hay una caja abierta de verdad, se pierde junto con todo lo demás.
-- ============================================================================

begin;

-- Todas juntas en un solo `truncate`: Postgres exige nombrar cada tabla que
-- referencia a otra, así que si mañana aparece una tabla nueva atada a estas,
-- este script falla en vez de dejar datos colgados sin que nadie se entere.
truncate table
  public.movimientos_caja,
  public.arqueos,
  public.movimientos_insumo,
  public.movimientos_balde,
  public.venta_items,
  public.potes,
  public.ventas,
  public.turnos_caja,
  public.baldes
restart identity;

-- Las series de códigos de baldes y de potes vuelven a empezar: ya no existe
-- ninguno, así que no hay nada con qué chocar.
alter sequence public.baldes_secuencia restart with 1;
alter sequence public.potes_secuencia restart with 1;

-- El stock de los insumos es un caché que solo mueve el ledger, y el ledger ya
-- está vacío: queda en cero, que es lo que dice un historial sin movimientos.
update public.insumos set cantidad = 0;

commit;

-- ----------------------------------------------------------------------------
-- Para mirar el resultado. Todo lo de arriba tiene que dar 0; lo de abajo, lo
-- que se conserva, tiene que seguir estando.
-- ----------------------------------------------------------------------------
select 'ventas' as tabla, count(*) as filas from public.ventas
union all select 'turnos de caja', count(*) from public.turnos_caja
union all select 'movimientos de caja', count(*) from public.movimientos_caja
union all select 'baldes', count(*) from public.baldes
union all select 'potes', count(*) from public.potes
union all select 'movimientos de insumo', count(*) from public.movimientos_insumo
union all select '-- se conserva: usuarios', count(*) from public.perfiles
union all select '-- se conserva: sabores', count(*) from public.sabores
union all select '-- se conserva: formatos', count(*) from public.formatos
union all select '-- se conserva: insumos, productos y envases', count(*) from public.insumos
union all select '-- se conserva: presentaciones', count(*) from public.presentaciones_insumo;
