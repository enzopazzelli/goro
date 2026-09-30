-- ============================================================================
-- Cierra dos puertas que la revisión de la rama encontró abiertas.
-- ============================================================================
-- 1. aplicar_movimiento_balde (migración de ventas) se creó sin quitarle el
--    permiso de ejecución. Postgres se lo da a PUBLIC en toda función nueva, y
--    PUBLIC incluye a `authenticated`: cualquier sesión podía sacarle kilos a
--    un balde por RPC, sin ninguna venta detrás. El comentario de aquella
--    migración decía que eso no se podía; el test que lo "probaba" fallaba por
--    otro motivo (el balde ya estaba lleno), no por falta de permiso.
--
-- 2. registrar_movimiento_insumo está abierta a cualquier sesión y recibe el
--    enum completo. Desde que el enum tiene 'venta' y 'anulacion', cualquiera
--    podía escribir un movimiento de venta sin venta detrás. Esos dos tipos
--    son solo de registrar_venta y anular_venta (vía aplicar_movimiento_insumo).
--    `create or replace` conserva los grants de la función.
-- ============================================================================

revoke execute on function public.aplicar_movimiento_balde(integer, public.tipo_movimiento_balde, numeric, integer)
  from public, anon, authenticated;

create or replace function public.registrar_movimiento_insumo(
  p_insumo_id integer,
  p_tipo public.tipo_movimiento_insumo,
  p_cantidad numeric,
  p_motivo text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not coalesce(public.auth_rol() is not null, false) then
    raise exception 'Sin sesión activa';
  end if;

  if p_tipo not in ('entrada', 'ajuste') then
    raise exception 'Tipo de movimiento inválido: solo entrada o ajuste.';
  end if;

  insert into public.movimientos_insumo (insumo_id, tipo, cantidad, motivo, creado_por)
  values (p_insumo_id, p_tipo, p_cantidad, p_motivo, auth.uid());

  update public.insumos set cantidad = cantidad + p_cantidad where id = p_insumo_id;
end;
$$;
