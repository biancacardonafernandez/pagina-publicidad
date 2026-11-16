-- Supabase default ACLs can grant RPC execution directly to anon/authenticated.
-- Set the intended allowlist explicitly for each contact function.
revoke all on function public.submit_contact_message(text, text, text, text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.submit_contact_message(text, text, text, text, text, text)
  to anon, authenticated;

revoke all on function public.admin_list_contact_messages()
  from public, anon, authenticated, service_role;
grant execute on function public.admin_list_contact_messages()
  to authenticated;
