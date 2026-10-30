-- Ativar eventos de inserção para o mapa em tempo real (Supabase Realtime).
do $$
begin
  alter publication supabase_realtime add table public.live_locations;
exception when duplicate_object then null;
end $$;
