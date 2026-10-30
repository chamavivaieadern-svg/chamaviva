-- Habilitar e-mail somente para alertas importantes.
alter table public.notifications add column if not exists send_email boolean not null default false;

create or replace function public.notify_song_submission()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
 insert into public.notifications(user_id,title,body,href,send_email)
 select m.user_id,'Nova letra para aprovação','Uma nova letra foi enviada por um músico.','/painel/musicas',true
 from public.church_memberships m join public.profiles p on p.id=m.user_id
 where m.church_id=new.church_id and p.role in ('director','pastor') and p.status='active';
 return new;
end $$;

create or replace function public.notify_song_review()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
 if old.status is distinct from new.status and new.status in ('approved','rejected') then
  insert into public.notifications(user_id,title,body,href,send_email)
  values(new.submitted_by,case when new.status='approved' then 'Letra aprovada' else 'Letra não aprovada' end,
  'A música "'||new.title||'" foi revisada pelo dirigente.','/painel/musicas',true);
 end if;
 return new;
end $$;

create or replace function public.notify_trip_driver()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
 if new.driver_id is not null then
  insert into public.notifications(user_id,title,body,href,send_email)
  values(new.driver_id,'Nova viagem atribuída','Você foi designado para a viagem "'||new.title||'".','/painel/viagens',true);
 end if;
 return new;
end $$;

create or replace function public.notify_published_event()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
 if new.status='published' and (tg_op='INSERT' or old.status is distinct from new.status) then
  insert into public.notifications(user_id,title,body,href,send_email)
  select m.user_id,'Nova programação publicada',new.title,'/painel/programacao',true
  from public.church_memberships m join public.profiles p on p.id=m.user_id
  where m.church_id=new.church_id and p.status='active';
 end if;
 return new;
end $$;
