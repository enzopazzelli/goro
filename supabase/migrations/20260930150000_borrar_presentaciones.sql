-- ============================================================================
-- Borrar presentaciones: una presentación creada por error (o que Goro ya no
-- va a usar) tiene que poder desaparecer. Mismo criterio que formatos, sabores
-- e insumos: se otorga `delete` al dueño y, si la presentación ya se vendió,
-- la foreign key de venta_items.presentacion_id rechaza el borrado sola. En ese
-- caso el camino es desactivarla ("A la venta" destildado).
-- ============================================================================
grant delete on public.presentaciones_insumo to authenticated;

create policy "presentaciones_insumo: solo el dueño borra"
  on public.presentaciones_insumo for delete to authenticated
  using (public.es_duenio());
