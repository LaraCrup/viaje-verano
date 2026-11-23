-- Link de Google Maps editable para "Cómo llegar" (si está vacío se busca la dirección).
alter table public.stays add column if not exists maps_url text;
