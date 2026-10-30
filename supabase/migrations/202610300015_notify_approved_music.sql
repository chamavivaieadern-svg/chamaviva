create or replace function public.notify_song_review()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
 if old.status is distinct from new.status and new.status in ('approved','rejected') then
  insert into public.notifications(user_id,title,body,href,send_email)
  values(new.submitted_by,case when new.status='approved' then 'Letra aprovada' else 'Letra não aprovada' end,
  'A música "'||new.title||'" foi revisada pelo dirigente.','/painel/musicas',true);
  if new.status='approved' then
   insert into public.notifications(user_id,title,body,href,send_email)
   select m.user_id,'Nova música na programação','A música "'||new.title||'" foi aprovada e adicionada à programação.','/painel/programacao',false
   from public.church_memberships m join public.profiles p on p.id=m.user_id
   where m.church_id=new.church_id and m.user_id<>new.submitted_by and p.role in ('musician','director','pastor') and p.status='active';
  end if;
 end if;
 return new;
end $$;
