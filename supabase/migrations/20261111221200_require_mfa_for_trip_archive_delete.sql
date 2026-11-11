create or replace function public.archive_and_delete_trip(target_trip uuid)
returns uuid language plpgsql security definer set search_path=pg_catalog,public
as $$
declare archive_id uuid;
begin
  if not public.has_aal2() or not public.is_admin() then
    raise exception 'Somente o ADM com autenticação em duas etapas pode arquivar e excluir viagens.' using errcode='42501';
  end if;
  archive_id:=private.capture_trip_report_snapshot(target_trip,auth.uid(),'manual_archive_before_trip_delete');
  if archive_id is null then raise exception 'Viagem não encontrada.' using errcode='P0002'; end if;
  delete from public.trips where id=target_trip;
  return archive_id;
end;
$$;
revoke all on function public.archive_and_delete_trip(uuid) from public,anon;
grant execute on function public.archive_and_delete_trip(uuid) to authenticated;
