drop policy if exists "musicians submit songs" on public.songs;
create policy "musicians submit songs to own church events" on public.songs for insert to authenticated with check(
 public.has_aal2()
 and submitted_by=auth.uid()
 and public.is_active_member(church_id)
 and public.has_role(array['musician'])
 and (event_id is null or exists(select 1 from public.events e where e.id=event_id and e.church_id=songs.church_id))
);

create or replace function public.review_song(target_song uuid, decision text)
returns void language plpgsql security definer set search_path=public
as $$
declare song_row public.songs%rowtype;
declare next_order integer;
begin
 if not public.has_aal2() then raise exception 'A autenticação em duas etapas é obrigatória.'; end if;
 if decision not in ('approved','rejected') then raise exception 'Decisão inválida.'; end if;
 select * into song_row from public.songs where id=target_song for update;
 if not found then raise exception 'Música não encontrada.'; end if;
 if song_row.status<>'pending' then raise exception 'Esta letra já foi revisada.'; end if;
 if not (public.is_admin() or (public.has_role(array['director']) and public.is_active_member(song_row.church_id))) then
  raise exception 'Somente o ADM ou dirigente autorizado pode revisar esta letra.';
 end if;
 if song_row.event_id is not null and not exists(select 1 from public.events e where e.id=song_row.event_id and e.church_id=song_row.church_id) then
  raise exception 'A programação selecionada não pertence à igreja desta música.';
 end if;
 update public.songs set status=decision,reviewed_by=auth.uid(),reviewed_at=now() where id=target_song;
 if decision='approved' and song_row.event_id is not null then
  select coalesce(max(sort_order)+1,0) into next_order from public.program_items where event_id=song_row.event_id;
  insert into public.program_items(event_id,title,participant_name,item_type,sort_order,notes,lyrics)
  values(song_row.event_id,song_row.title,song_row.artist,'worship',next_order,'Letra aprovada pelo dirigente.',song_row.lyrics);
 end if;
end $$;
