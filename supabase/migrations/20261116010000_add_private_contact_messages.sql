-- Contact form submissions are stored outside the PostgREST-exposed public schema.
-- Visitors can submit only through the narrowly scoped RPC below; they cannot read rows.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 120),
  business text not null check (length(btrim(business)) between 1 and 160),
  email text not null check (length(btrim(email)) between 3 and 254 and btrim(email) ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  business_type text not null check (length(btrim(business_type)) between 1 and 120),
  need text not null check (need in (
    'Asesoramiento inicial',
    'Gestión de redes sociales',
    'Branding e identidad visual',
    'Publicidad digital'
  )),
  message text not null check (length(btrim(message)) between 1 and 5000),
  created_at timestamptz not null default now()
);

alter table private.contact_messages enable row level security;

-- These policies are defense in depth. The API roles have no direct schema/table
-- privileges; the RPC functions below are the only supported access path.
drop policy if exists "Contact submissions accepted" on private.contact_messages;
create policy "Contact submissions accepted"
  on private.contact_messages for insert to anon, authenticated
  with check (true);

drop policy if exists "Only admins read contact messages" on private.contact_messages;
create policy "Only admins read contact messages"
  on private.contact_messages for select to authenticated
  using ((select public.is_project_admin()));

revoke all on table private.contact_messages from public, anon, authenticated;

create or replace function public.submit_contact_message(
  p_name text,
  p_business text,
  p_email text,
  p_business_type text,
  p_need text,
  p_message text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into private.contact_messages (name, business, email, business_type, need, message)
  values (
    btrim(p_name),
    btrim(p_business),
    lower(btrim(p_email)),
    btrim(p_business_type),
    p_need,
    btrim(p_message)
  );
end;
$$;

revoke all on function public.submit_contact_message(text, text, text, text, text, text) from public;
grant execute on function public.submit_contact_message(text, text, text, text, text, text) to anon, authenticated;

create or replace function public.admin_list_contact_messages()
returns table (
  id uuid,
  name text,
  business text,
  email text,
  business_type text,
  need text,
  message text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_project_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  return query
  select m.id, m.name, m.business, m.email, m.business_type, m.need, m.message, m.created_at
  from private.contact_messages as m
  order by m.created_at desc;
end;
$$;

revoke all on function public.admin_list_contact_messages() from public;
grant execute on function public.admin_list_contact_messages() to authenticated;
