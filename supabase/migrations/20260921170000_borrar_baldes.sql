-- ============================================================================
-- Borrar baldes: solo mientras están 'cerrado'. A diferencia de
-- Formatos/Sabores/Insumos, un balde puede estar 'abierto' y en uso real
-- sin tener ninguna fila en movimientos_balde todavía (abrir un balde no
-- genera movimiento, solo vender/ajustar/corregir sí) — así que la FK sola
-- no alcanza para protegerlo. La condición de estado en la política es la
-- barrera real: una vez abierto, corregir es un ajuste, no un borrado.
-- ============================================================================

grant delete on public.baldes to authenticated;

create policy "baldes: solo el dueño borra, y solo si está cerrado"
  on public.baldes for delete to authenticated
  using (public.es_duenio() and estado = 'cerrado');
