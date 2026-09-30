-- ============================================================================
-- Reiniciar la base: borra TODO lo de `public` (tablas, datos, funciones,
-- tipos, políticas) para volver a aplicar las migraciones desde cero.
-- ============================================================================
-- ES DESTRUCTIVO Y NO SE PUEDE DESHACER. Se usa una sola vez, ahora que las
-- migraciones se reescribieron (una por módulo, con todos los arreglos ya
-- integrados) y el sistema todavía no tiene datos reales.
--
-- NO toca los usuarios de Authentication (schema `auth`): siguen existiendo,
-- pero pierden su fila de `perfiles`, que se recrea al final (ver
-- supabase/README.md, paso "Recuperar los perfiles").
--
-- Después de correr esto, aplicar en orden las cinco migraciones nuevas y
-- supabase/carga_productos_goro.sql.
-- ============================================================================

drop schema public cascade;
create schema public;

-- Lo que Supabase da por defecto a `public`. En este proyecto las tablas
-- nuevas NO se exponen solas a la API ("Automatically expose new tables"
-- apagado): cada migración da sus grants a `authenticated`. Lo único que hace
-- falta acá es lo del servidor: `service_role` (la clave secreta, la que usan
-- los tests de base) tiene que poder tocar todo lo que se cree de acá en más.
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on schema public to postgres, service_role;

alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on functions to service_role;

-- Que la API vuelva a leer el esquema.
notify pgrst, 'reload schema';
