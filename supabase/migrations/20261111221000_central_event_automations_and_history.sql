-- Central de automações internas com ativação pelo ADM, notificações e histórico.
create table if not exists public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  name text not null,
  description text not null,
  enabled boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.automation_rules(id) on delete restrict,
  event_key text not null,
  source_table text not null,
  source_id text not null,
  status text not null default 'completed' check(status in ('completed','skipped','failed')),
  message text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(rule_id,source_table,source_id)
);
create index if not exists automation_runs_created_idx on public.automation_runs(created_at desc);
alter table public.automation_rules enable row level security;
alter table public.automation_runs enable row level security;
drop policy if exists "admins manage automation rules" on public.automation_rules;
create policy "admins manage automation rules" on public.automation_rules for all to authenticated
using(has_aal2() and public.is_admin()) with check(has_aal2() and public.is_admin());
drop policy if exists "admins read automation history" on public.automation_runs;
create policy "admins read automation history" on public.automation_runs for select to authenticated
using(has_aal2() and public.is_admin());
grant select,insert,update,delete on public.automation_rules to authenticated;
grant select on public.automation_runs to authenticated;

insert into public.automation_rules(event_key,name,description,enabled) values
 ('trip_created','Avisar sobre nova viagem','Notifica ADM e pastor quando uma nova viagem é cadastrada.',true),
 ('trip_completed','Relatório de viagem concluída','Registra a execução e avisa ADM e pastor quando uma viagem é concluída.',true),
 ('group_checklist_completed','Preparação do grupo concluída','Avisa ADM e pastor quando todos os itens do checklist de um grupo forem concluídos.',true),
 ('roll_call_completed','Chamada finalizada','Avisa ADM e pastor quando uma chamada de passageiros fica completa.',true)
on conflict(event_key) do nothing;

create or replace function private.execute_chama_viva_automation(
 target_event text,target_table text,target_id text,target_church uuid,
 notification_title text,notification_body text,notification_href text
) returns void language plpgsql security definer set search_path=pg_catalog,public,private
as $$
declare
  rule_row public.automation_rules%rowtype;
  run_id uuid;
  recipient uuid;
begin
  select * into rule_row from public.automation_rules where event_key=target_event and enabled=true;
  if not found then return; end if;
  insert into public.automation_runs(rule_id,event_key,source_table,source_id,status,message,details)
  values(rule_row.id,target_event,target_table,target_id,'completed','Automação executada.',jsonb_build_object('church_id',target_church))
  on conflict(rule_id,source_table,source_id) do nothing
  returning id into run_id;
  if run_id is null then return; end if;

  for recipient in
    select p.id from public.profiles p where p.status='active' and p.role='admin'
    union
    select c.pastor_id from public.churches c join public.profiles p on p.id=c.pastor_id
      where c.id=target_church and p.status='active' and p.role='pastor' and c.pastor_id is not null
  loop
    insert into public.notifications(user_id,title,body,href,send_email)
    values(recipient,notification_title,notification_body,notification_href,false);
  end loop;
exception when others then
  insert into public.automation_runs(rule_id,event_key,source_table,source_id,status,message,details)
  values(coalesce(rule_row.id,gen_random_uuid()),target_event,target_table,target_id,'failed',sqlerrm,jsonb_build_object('church_id',target_church))
  on conflict do nothing;
end;
$$;
revoke all on function private.execute_chama_viva_automation(text,text,text,uuid,text,text,text) from public,anon,authenticated;

create or replace function public.automation_on_trip_created()
returns trigger language plpgsql security definer set search_path=pg_catalog,public,private
as $$
begin
  perform private.execute_chama_viva_automation('trip_created','trips',new.id::text,new.church_id,
    'Nova viagem cadastrada','A viagem "'||new.title||'" foi cadastrada no CHAMA VIVA.','/painel/viagens');
  return new;
end;
$$;
drop trigger if exists automation_trip_created on public.trips;
create trigger automation_trip_created after insert on public.trips for each row execute function public.automation_on_trip_created();

create or replace function public.automation_on_trip_completed()
returns trigger language plpgsql security definer set search_path=pg_catalog,public,private
as $$
begin
  if new.status='completed' and old.status is distinct from new.status then
    perform private.execute_chama_viva_automation('trip_completed','trips',new.id::text,new.church_id,
      'Viagem concluída','A viagem "'||new.title||'" foi marcada como concluída. O relatório foi preservado.','/painel/relatorios');
  end if;
  return new;
end;
$$;
drop trigger if exists automation_trip_completed on public.trips;
create trigger automation_trip_completed after update of status on public.trips for each row execute function public.automation_on_trip_completed();

create or replace function public.automation_on_group_checklist_completed()
returns trigger language plpgsql security definer set search_path=pg_catalog,public,private
as $$
declare group_row public.evangelism_groups%rowtype;
begin
  if new.is_done and old.is_done is distinct from new.is_done
     and not exists(select 1 from public.evangelism_group_checklists c where c.group_id=new.group_id and not c.is_done) then
    select * into group_row from public.evangelism_groups where id=new.group_id;
    perform private.execute_chama_viva_automation('group_checklist_completed','evangelism_groups',group_row.id::text,group_row.church_id,
      'Preparação do grupo concluída','O checklist do grupo "'||group_row.name||'" foi concluído.','/painel/atividades');
  end if;
  return new;
end;
$$;
drop trigger if exists automation_group_checklist_completed on public.evangelism_group_checklists;
create trigger automation_group_checklist_completed after update of is_done on public.evangelism_group_checklists
for each row execute function public.automation_on_group_checklist_completed();

create or replace function public.automation_on_roll_call_completed()
returns trigger language plpgsql security definer set search_path=pg_catalog,public,private
as $$
declare session_row public.roll_call_sessions%rowtype;trip_church uuid;
begin
  if new.status<>'pending' and old.status is distinct from new.status
     and not exists(select 1 from public.roll_call_entries e where e.session_id=new.session_id and e.status='pending') then
    select * into session_row from public.roll_call_sessions where id=new.session_id;
    select church_id into trip_church from public.trips where id=session_row.trip_id;
    perform private.execute_chama_viva_automation('roll_call_completed','roll_call_sessions',session_row.id::text,trip_church,
      'Chamada finalizada','A chamada "'||session_row.title||'" foi finalizada.','/painel/viagens');
  end if;
  return new;
end;
$$;
drop trigger if exists automation_roll_call_completed on public.roll_call_entries;
create trigger automation_roll_call_completed after update of status on public.roll_call_entries
for each row execute function public.automation_on_roll_call_completed();
