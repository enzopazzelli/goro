-- ============================================================================
-- Dos valores nuevos para los movimientos de insumo: venta y anulación.
-- ============================================================================
-- Van solos en su propia migración: Postgres no deja usar un valor de enum
-- recién agregado dentro de la misma transacción que lo agrega, y la
-- migración siguiente los usa. Espejan a tipo_movimiento_balde. (La
-- migración de inventario anticipaba 'consumo'; se prefiere venta/anulacion
-- para que el ledger de insumos y el de baldes se lean igual.)
-- ============================================================================
alter type public.tipo_movimiento_insumo add value if not exists 'venta';
alter type public.tipo_movimiento_insumo add value if not exists 'anulacion';
