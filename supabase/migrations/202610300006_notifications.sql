-- Notificações persistentes e automáticas para ações importantes.
create or replace function public.notify_song_submission()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
 insert into public.notifications(user_id,title,body,href)
 select m.user_id,'Nova letra para aprovação','Uma nova letra foi enviada por um músico.','/painel/musicas'
 from public.church_memberships m join public.profiles p on p.id=m.user_id
 where m.church_id=new.church_id and p.role in ('director','pastor') and p.status='active';
 return new;
end $$;

create or replace function public.notify_song_review()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
 if old.status is distinct from new.status and new.status in ('approved','rejected') then
  insert into public.notifications(user_id,title,body,href)
  values(new.submitted_by,case when new.status='approved' then 'Letra aprovada' else 'Letra não aprovada' end,
  'A música "'||new.title||'" foi revisada pelo dirigente.','/painel/musicas');
 end if;
 return new;
end $$;

create or replace function public.notify_trip_driver()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
 if new.driver_id is not null then
  insert into public.notifications(user_id,title,body,href)
  values(new.driver_id,'Nova viagem atribuída','Você foi designado para a viagem "'||new.title||'".','/painel/viagens');
 end if;
 return new;
end $$;

create or replace function public.notify_message_recipient()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
 insert into public.notifications(user_id,title,body,href)
 values(new.recipient_id,coalesce(new.subject,'Nova mensagem'),'Você recebeu uma mensagem particular.','/painel/mensagens');
 return new;
end $$;

create or replace function public.notify_published_event()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
 if new.status='published' and (tg_op='INSERT' or old.status is distinct from new.status) then
  insert into public.notifications(user_id,title,body,href)
  select m.user_id,'Nova programação publicada',new.title,'/painel/programacao'
  from public.church_memberships m join public.profiles p on p.id=m.user_id
  where m.church_id=new.church_id and p.status='active';
 end if;
 return new;
end $$;

drop trigger if exists chama_song_submitted on public.songs;
create trigger chama_song_submitted after insert on public.songs for each row execute function public.notify_song_submission();
drop trigger if exists chama_song_reviewed on public.songs;
create trigger chama_song_reviewed after update on public.songs for each row execute function public.notify_song_review();
drop trigger if exists chama_trip_assigned on public.trips;
create trigger chama_trip_assigned after insert on public.trips for each row execute function public.notify_trip_driver();
drop trigger if exists chama_message_received on public.messages;
create trigger chama_message_received after insert on public.messages for each row execute function public.notify_message_recipient();
drop trigger if exists chama_event_published on public.events;
create trigger chama_event_published after insert or update on public.events for each row execute function public.notify_published_event();

do $$
begin
 alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;
