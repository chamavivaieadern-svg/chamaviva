-- Programações em rascunho ficam restritas ao ADM, pastor e dirigente.
drop policy if exists "events read by church" on public.events;
create policy "events read published or by organizers" on public.events for select to authenticated using(
 public.has_aal2()
 and public.is_active_member(church_id)
 and (status='published' or public.is_admin() or public.has_role(array['pastor','director']))
);

drop policy if exists "program items read by event church" on public.program_items;
create policy "program items read published or by organizers" on public.program_items for select to authenticated using(
 public.has_aal2()
 and exists(select 1 from public.events e where e.id=event_id and public.is_active_member(e.church_id)
  and (e.status='published' or public.is_admin() or public.has_role(array['pastor','director'])))
);
