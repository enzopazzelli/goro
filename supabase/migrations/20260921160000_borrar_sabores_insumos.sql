-- ============================================================================
-- Borrar sabores e insumos. Mismo criterio que Formatos (Fase 2b): un
-- sabor o insumo cargado por error tiene que poder desaparecer. Si ya
-- tiene baldes o movimientos cargados, la foreign key correspondiente
-- (baldes.sabor_id, movimientos_insumo.insumo_id) va a rechazar el borrado
-- sola — no hace falta escribir ningún chequeo a mano.
--
-- El `update` de ambas tablas ya está otorgado desde Fase 2
-- (grant update on public.sabores / grant update (...) on public.insumos),
-- así que esta migración solo agrega lo que falta: delete.
-- ============================================================================

grant delete on public.sabores to authenticated;

create policy "sabores: solo el dueño borra"
  on public.sabores for delete to authenticated
  using (public.es_duenio());

grant delete on public.insumos to authenticated;

create policy "insumos: solo el dueño borra"
  on public.insumos for delete to authenticated
  using (public.es_duenio());
