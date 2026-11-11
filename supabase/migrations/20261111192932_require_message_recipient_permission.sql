drop policy if exists "users message same church peers after MFA" on public.messages;
create policy "users message same church peers after MFA" on public.messages for insert to authenticated with check (
 has_aal2()
 and sender_id=auth.uid()
 and (is_admin() or exists(select 1 from public.profiles s where s.id=auth.uid() and s.can_send_messages))
 and exists(select 1 from public.profiles r where r.id=recipient_id and r.status='active' and (r.can_receive_messages or r.role='admin'))
 and (
  is_admin()
  or exists(select 1 from public.church_memberships s join public.church_memberships r on r.church_id=s.church_id where s.user_id=auth.uid() and r.user_id=messages.recipient_id)
 )
);