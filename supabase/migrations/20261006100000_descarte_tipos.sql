-- ============================================================================
-- Descarte (1 de 2): los valores nuevos de los ledgers.
-- ============================================================================
-- Un valor agregado a un enum no se puede usar en la misma transacción que lo
-- agrega, y cada migración corre en una. Por eso esto va solo y antes de la
-- migración que crea la tabla de descartes y las funciones que lo usan.
-- ============================================================================

alter type public.tipo_movimiento_balde add value if not exists 'descarte';
alter type public.tipo_movimiento_insumo add value if not exists 'descarte';
