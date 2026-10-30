-- Funções transacionais para início/fim de GPS com consentimento explícito.
create or replace function public.start_trip_tracking(target_trip uuid)
returns void language plpgsql security definer set search_path=public
as $$
begin
  update public.trips
  set status='in_progress', tracking_consent_at=now(), tracking_started_at=now(), tracking_ended_at=null
  where id=target_trip and driver_id=auth.uid() and status in ('scheduled','awaiting_departure','arrived');
  if not found then raise exception 'Viagem não atribuída ao motorista ou não pode ser iniciada.'; end if;
end $$;

create or replace function public.finish_trip_tracking(target_trip uuid, final_status text default 'completed')
returns void language plpgsql security definer set search_path=public
as $$
begin
  if final_status not in ('arrived','completed','issue') then raise exception 'Status final inválido.'; end if;
  update public.trips set status=final_status, tracking_ended_at=now()
  where id=target_trip and driver_id=auth.uid() and status='in_progress';
  if not found then raise exception 'Viagem ativa não encontrada para este motorista.'; end if;
end $$;

create or replace function public.start_group_sharing(target_group uuid)
returns void language plpgsql security definer set search_path=public
as $$
begin
  update public.evangelism_groups
  set status='active', sharing_consent_at=now(), sharing_started_at=now(), sharing_ended_at=null
  where id=target_group and leader_id=auth.uid() and status in ('planned','completed');
  if not found then raise exception 'Grupo não atribuído a este líder ou não pode ser iniciado.'; end if;
end $$;

create or replace function public.finish_group_sharing(target_group uuid)
returns void language plpgsql security definer set search_path=public
as $$
begin
  update public.evangelism_groups set status='completed', sharing_ended_at=now()
  where id=target_group and leader_id=auth.uid() and status='active';
  if not found then raise exception 'Grupo ativo não encontrado para este líder.'; end if;
end $$;

grant execute on function public.start_trip_tracking(uuid) to authenticated;
grant execute on function public.finish_trip_tracking(uuid,text) to authenticated;
grant execute on function public.start_group_sharing(uuid) to authenticated;
grant execute on function public.finish_group_sharing(uuid) to authenticated;

-- Bucket privado para logos e documentos institucionais.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('chama-viva-assets','chama-viva-assets',false,10485760,array['image/png','image/jpeg','image/webp','image/svg+xml','application/pdf'])
on conflict(id) do nothing;

create policy "signed users read approved assets" on storage.objects for select to authenticated
using(bucket_id='chama-viva-assets');
create policy "only admin uploads assets" on storage.objects for insert to authenticated
with check(bucket_id='chama-viva-assets' and public.is_admin());
create policy "only admin updates assets" on storage.objects for update to authenticated
using(bucket_id='chama-viva-assets' and public.is_admin())
with check(bucket_id='chama-viva-assets' and public.is_admin());
create policy "only admin deletes assets" on storage.objects for delete to authenticated
using(bucket_id='chama-viva-assets' and public.is_admin());
