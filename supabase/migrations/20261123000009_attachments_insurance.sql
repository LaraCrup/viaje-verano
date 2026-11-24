-- Seguro de viaje de cada integrante: adjunto con owner_type 'insurance' y owner_id = la integrante.
alter table public.attachments drop constraint if exists attachments_owner_type_check;
alter table public.attachments add constraint attachments_owner_type_check
  check (owner_type in ('transport', 'stay', 'expense', 'journal', 'other', 'insurance'));
