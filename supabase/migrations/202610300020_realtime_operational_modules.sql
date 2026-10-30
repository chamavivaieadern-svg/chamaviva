-- Publicar tabelas operacionais para eventos Realtime, sempre respeitando RLS.
do $$
declare tbl text;
begin
 foreach tbl in array array[
  'profiles','churches','church_memberships','events','program_items','songs',
  'vehicles','trips','trip_passengers','evangelism_groups','messages','brand_assets'
 ] loop
  begin
   execute format('alter publication supabase_realtime add table public.%I',tbl);
  exception when duplicate_object then null;
  end;
 end loop;
end $$;
