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
  if rule_row.id is not null then
    insert into public.automation_runs(rule_id,event_key,source_table,source_id,status,message,details)
    values(rule_row.id,target_event,target_table,target_id,'failed',sqlerrm,jsonb_build_object('church_id',target_church))
    on conflict(rule_id,source_table,source_id) do nothing;
  end if;
end;
$$;
revoke all on function private.execute_chama_viva_automation(text,text,text,uuid,text,text,text) from public,anon,authenticated;
