-- Somente ADM e dirigente podem revisar letras e editar a ordem oficial.
drop policy if exists "director reviews songs" on public.songs;
create policy "admin or director reviews songs" on public.songs for update to authenticated
using(public.is_admin() or (public.is_active_member(church_id) and public.has_role(array['director'])))
with check(public.is_admin() or (public.is_active_member(church_id) and public.has_role(array['director'])));

drop policy if exists "program items manage by leaders" on public.program_items;
create policy "admin or director manages program items" on public.program_items for all to authenticated
using(public.is_admin() or exists(select 1 from public.events e where e.id=event_id and public.is_active_member(e.church_id) and public.has_role(array['director'])))
with check(public.is_admin() or exists(select 1 from public.events e where e.id=event_id and public.is_active_member(e.church_id) and public.has_role(array['director'])));
