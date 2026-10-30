-- Permitir ao motorista atribuído consultar os grupos associados à própria viagem.
drop policy if exists "groups visible by church" on public.evangelism_groups;
create policy "groups visible by church leader or assigned driver" on public.evangelism_groups for select to authenticated using(
 public.is_active_member(church_id)
 or leader_id=auth.uid()
 or exists(select 1 from public.trips t where t.id=trip_id and t.driver_id=auth.uid())
);
