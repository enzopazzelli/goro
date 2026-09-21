-- ============================================================================
-- Color de sabor: dato de negocio, no un token de diseño. El mockup lo
-- describe así: "el color real de cada sabor es un dato del sistema y
-- aparece igual en todos lados". Sin esta columna, la cubeta no puede ser
-- fiel al mockup.
-- ============================================================================
alter table public.sabores
  add column color text not null default '#3F6B3A',
  add constraint color_formato_hex check (color ~ '^#[0-9a-fA-F]{6}$');
