-- En Supabase cloud, anon (sin sesión) recibe EXECUTE por defecto en las funciones de public.
-- La app siempre inicia una sesión anónima antes de llamarlas, así que anon no necesita ninguna.
revoke execute on function public.get_trip_public(text) from anon;
revoke execute on function public.join_with_pin(text, uuid, text) from anon;
revoke execute on function public.redeem_invite(text) from anon;
revoke execute on function public.create_invite(uuid, uuid) from anon;
revoke execute on function public.invite_status(uuid) from anon;
