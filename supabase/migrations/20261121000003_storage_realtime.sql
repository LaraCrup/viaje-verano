-- =====================================================================
-- Storage (pasajes, tickets, fotos) y Realtime
-- =====================================================================

-- Bucket privado. Rutas: {trip_id}/{tipo}/{uuid}.{ext}
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'trip-files', 'trip-files', false, 20971520,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
)
on conflict (id) do nothing;

create policy "integrantes leen archivos del viaje" on storage.objects
  for select to authenticated
  using (bucket_id = 'trip-files' and private.is_trip_member(private.try_uuid((storage.foldername(name))[1])));

create policy "integrantes suben archivos al viaje" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'trip-files' and private.is_trip_member(private.try_uuid((storage.foldername(name))[1])));

create policy "integrantes reemplazan archivos del viaje" on storage.objects
  for update to authenticated
  using (bucket_id = 'trip-files' and private.is_trip_member(private.try_uuid((storage.foldername(name))[1])));

-- Realtime: los cambios llegan al instante a todos los celulares (respeta RLS).
alter publication supabase_realtime add table
  public.trips, public.members, public.places, public.chapters, public.days, public.pots,
  public.expenses, public.settlements, public.transports, public.stays, public.plans, public.attachments;
