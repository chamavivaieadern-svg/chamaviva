-- Exigir AAL2 no próprio banco, não apenas na interface Next.js.
create or replace function public.has_aal2()
returns boolean language sql stable
as $$ select coalesce(auth.jwt()->>'aal','aal1')='aal2' $$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select public.has_aal2() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin' and p.status='active') $$;

create or replace function public.is_active_member(target_church uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select public.has_aal2() and (public.is_admin() or exists(select 1 from public.church_memberships m join public.profiles p on p.id=m.user_id where m.church_id=target_church and m.user_id=auth.uid() and p.status='active')) $$;

create or replace function public.has_role(allowed text[])
returns boolean language sql stable security definer set search_path=public
as $$ select public.has_aal2() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role=any(allowed) and p.status='active') $$;

drop policy if exists "profiles read self or admin or church peer" on public.profiles;
create policy "profiles read self or authorized church peer" on public.profiles for select to authenticated using(
 public.has_aal2() and (id=auth.uid() or public.is_admin() or exists(select 1 from public.church_memberships mine join public.church_memberships theirs on mine.church_id=theirs.church_id where mine.user_id=auth.uid() and theirs.user_id=profiles.id))
);
drop policy if exists "memberships visible to self or admin" on public.church_memberships;
create policy "memberships visible after MFA" on public.church_memberships for select to authenticated using(public.has_aal2() and (user_id=auth.uid() or public.is_admin() or public.is_active_member(church_id)));

drop policy if exists "vehicles read by pastor or assigned driver" on public.vehicles;
create policy "vehicles read by authorized users with MFA" on public.vehicles for select to authenticated using(
 public.has_aal2() and (public.is_admin()
 or (public.is_active_member(church_id) and public.has_role(array['pastor']))
 or exists(select 1 from public.trips t where t.vehicle_id=vehicles.id and t.driver_id=auth.uid()))
);

drop policy if exists "trips read by pastor driver or linked leader" on public.trips;
create policy "trips read by authorized users with MFA" on public.trips for select to authenticated using(
 public.has_aal2() and (public.is_admin()
 or driver_id=auth.uid()
 or (public.is_active_member(church_id) and public.has_role(array['pastor']))
 or exists(select 1 from public.evangelism_groups g where g.trip_id=trips.id and g.leader_id=auth.uid()))
);

drop policy if exists "passengers read by pastor driver or passenger" on public.trip_passengers;
create policy "passengers read after MFA" on public.trip_passengers for select to authenticated using(
 public.has_aal2() and (public.is_admin()
 or church_member_id=auth.uid()
 or exists(select 1 from public.trips t where t.id=trip_id and (t.driver_id=auth.uid() or (public.is_active_member(t.church_id) and public.has_role(array['pastor'])))))
);

drop policy if exists "admin pastor driver update passengers" on public.trip_passengers;
create policy "admin pastor driver update passengers after MFA" on public.trip_passengers for all to authenticated
using(public.has_aal2() and (public.is_admin() or exists(select 1 from public.trips t where t.id=trip_id and (t.driver_id=auth.uid() or (public.is_active_member(t.church_id) and public.has_role(array['pastor']))))))
with check(public.has_aal2() and (public.is_admin() or exists(select 1 from public.trips t where t.id=trip_id and (t.driver_id=auth.uid() or (public.is_active_member(t.church_id) and public.has_role(array['pastor']))))));

drop policy if exists "groups visible by pastor leader or assigned driver" on public.evangelism_groups;
create policy "groups visible after MFA" on public.evangelism_groups for select to authenticated using(
 public.has_aal2() and (public.is_admin()
 or leader_id=auth.uid()
 or (public.is_active_member(church_id) and public.has_role(array['pastor']))
 or exists(select 1 from public.trips t where t.id=trip_id and t.driver_id=auth.uid()))
);

drop policy if exists "locations visible to pastor driver or linked group leader" on public.live_locations;
create policy "locations visible after MFA" on public.live_locations for select to authenticated using(
 public.has_aal2() and (public.is_admin()
 or exists(select 1 from public.trips t where t.id=trip_id and (
   t.driver_id=auth.uid()
   or (public.is_active_member(t.church_id) and public.has_role(array['pastor']))
   or exists(select 1 from public.evangelism_groups g where g.trip_id=t.id and g.leader_id=auth.uid())
 ))
 or exists(select 1 from public.evangelism_groups g where g.id=group_id and (
   g.leader_id=auth.uid()
   or (public.is_active_member(g.church_id) and public.has_role(array['pastor']))
   or exists(select 1 from public.trips t where t.id=g.trip_id and t.driver_id=auth.uid())
 )))
);

drop policy if exists "consented driver or group leader inserts location" on public.live_locations;
create policy "consented driver or group leader inserts location after MFA" on public.live_locations for insert to authenticated with check(
 public.has_aal2() and user_id=auth.uid()
 and ((trip_id is not null and exists(select 1 from public.trips t where t.id=trip_id and t.driver_id=auth.uid() and t.status='in_progress' and t.tracking_consent_at is not null and t.tracking_ended_at is null))
 or (group_id is not null and exists(select 1 from public.evangelism_groups g where g.id=group_id and g.leader_id=auth.uid() and g.status='active' and g.sharing_consent_at is not null and g.sharing_ended_at is null)))
);

drop policy if exists "messages only sender and recipient" on public.messages;
create policy "messages only sender and recipient after MFA" on public.messages for select to authenticated using(public.has_aal2() and (sender_id=auth.uid() or recipient_id=auth.uid()));
drop policy if exists "users message same church peers" on public.messages;
create policy "users message same church peers after MFA" on public.messages for insert to authenticated with check(
 public.has_aal2() and sender_id=auth.uid()
 and (public.is_admin() or exists(select 1 from public.church_memberships s join public.church_memberships r on r.church_id=s.church_id where s.user_id=auth.uid() and r.user_id=recipient_id))
);
drop policy if exists "recipient marks own messages read" on public.messages;
create policy "recipient marks own messages read after MFA" on public.messages for update to authenticated using(public.has_aal2() and recipient_id=auth.uid()) with check(public.has_aal2() and recipient_id=auth.uid());

drop policy if exists "notifications only owner" on public.notifications;
create policy "notifications only owner after MFA" on public.notifications for select to authenticated using(public.has_aal2() and (user_id=auth.uid() or public.is_admin()));
drop policy if exists "user marks own notifications" on public.notifications;
create policy "user marks own notifications after MFA" on public.notifications for update to authenticated using(public.has_aal2() and user_id=auth.uid()) with check(public.has_aal2() and user_id=auth.uid());

drop policy if exists "assets visible to signed in users" on public.brand_assets;
create policy "assets visible after MFA" on public.brand_assets for select to authenticated using(public.has_aal2());
drop policy if exists "audit visible to admin" on public.audit_logs;
create policy "audit visible to admin after MFA" on public.audit_logs for select to authenticated using(public.is_admin());
drop policy if exists "authenticated audit insert" on public.audit_logs;
create policy "audit insert after MFA" on public.audit_logs for insert to authenticated with check(public.has_aal2() and actor_id=auth.uid());

drop policy if exists "signed users read approved assets" on storage.objects;
create policy "signed users read assets after MFA" on storage.objects for select to authenticated using(bucket_id='chama-viva-assets' and public.has_aal2());

create or replace function public.start_trip_tracking(target_trip uuid)
returns void language plpgsql security definer set search_path=public
as $$
begin
 if not public.has_aal2() then raise exception 'A autenticação em duas etapas é obrigatória.'; end if;
 update public.trips
 set status='in_progress', tracking_consent_at=now(), tracking_started_at=now(), tracking_ended_at=null
 where id=target_trip and driver_id=auth.uid() and status in ('scheduled','awaiting_departure','arrived');
 if not found then raise exception 'Viagem não atribuída ao motorista ou não pode ser iniciada.'; end if;
end $$;

create or replace function public.finish_trip_tracking(target_trip uuid, final_status text default 'completed')
returns void language plpgsql security definer set search_path=public
as $$
begin
 if not public.has_aal2() then raise exception 'A autenticação em duas etapas é obrigatória.'; end if;
 if final_status not in ('arrived','completed','issue') then raise exception 'Status final inválido.'; end if;
 update public.trips set status=final_status, tracking_ended_at=now()
 where id=target_trip and driver_id=auth.uid() and status='in_progress';
 if not found then raise exception 'Viagem ativa não encontrada para este motorista.'; end if;
end $$;

create or replace function public.start_group_sharing(target_group uuid)
returns void language plpgsql security definer set search_path=public
as $$
begin
 if not public.has_aal2() then raise exception 'A autenticação em duas etapas é obrigatória.'; end if;
 update public.evangelism_groups
 set status='active', sharing_consent_at=now(), sharing_started_at=now(), sharing_ended_at=null
 where id=target_group and leader_id=auth.uid() and status in ('planned','completed');
 if not found then raise exception 'Grupo não atribuído a este líder ou não pode ser iniciado.'; end if;
end $$;

create or replace function public.finish_group_sharing(target_group uuid)
returns void language plpgsql security definer set search_path=public
as $$
begin
 if not public.has_aal2() then raise exception 'A autenticação em duas etapas é obrigatória.'; end if;
 update public.evangelism_groups set status='completed', sharing_ended_at=now()
 where id=target_group and leader_id=auth.uid() and status='active';
 if not found then raise exception 'Grupo ativo não encontrado para este líder.'; end if;
end $$;
