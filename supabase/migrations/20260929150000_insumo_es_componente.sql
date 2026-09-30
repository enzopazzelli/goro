-- ============================================================================
-- Qué insumos pueden consumirse dentro de un formato.
-- ============================================================================
-- Al configurar "qué consume" un formato, la lista ofrecía todos los insumos,
-- incluidos los que solo se revenden (bombón, palito, sándwich). Esta marca
-- separa los componentes de un formato (los conos) del resto. Solo el dueño
-- la cambia: el `update` de insumos ya es del dueño por política, acá solo se
-- agrega la columna a los permisos.
--
-- Los cinco conos de la carga inicial se marcan acá mismo por nombre; si no
-- existen todavía, el update no toca nada.
-- ============================================================================
alter table public.insumos
  add column es_componente boolean not null default false;

grant update (es_componente) on public.insumos to authenticated;

update public.insumos
  set es_componente = true
  where nombre in ('Cono simple', 'Cono doble', 'Canasta', 'Cono dulce', 'Cono cucuruchón dulce');
