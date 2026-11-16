-- Project access is enforced by Postgres RLS and private Storage policies.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

revoke all on public.admin_users from anon, authenticated;

create or replace function public.is_project_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users a
    where a.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_project_admin() from public;
grant execute on function public.is_project_admin() to anon, authenticated;

create table if not exists public.advertising_projects (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (length(trim(titulo)) between 1 and 160),
  descripcion text not null check (length(trim(descripcion)) between 1 and 5000),
  categoria text not null check (categoria in ('publicidad', 'redes', 'branding', 'diseno')),
  imagen text not null check (length(trim(imagen)) between 1 and 1000),
  fecha date not null default current_date,
  estado text not null default 'borrador' check (estado in ('borrador', 'publicado'))
);

alter table public.advertising_projects enable row level security;
revoke all on public.advertising_projects from anon, authenticated;
grant select on public.advertising_projects to anon, authenticated;
grant insert, update, delete on public.advertising_projects to authenticated;

drop policy if exists "Anyone reads published projects" on public.advertising_projects;
create policy "Anyone reads published projects"
  on public.advertising_projects for select to anon, authenticated
  using (estado = 'publicado' or (select public.is_project_admin()));

drop policy if exists "Admins create projects" on public.advertising_projects;
create policy "Admins create projects"
  on public.advertising_projects for insert to authenticated
  with check ((select public.is_project_admin()));

drop policy if exists "Admins update projects" on public.advertising_projects;
create policy "Admins update projects"
  on public.advertising_projects for update to authenticated
  using ((select public.is_project_admin()))
  with check ((select public.is_project_admin()));

drop policy if exists "Admins delete projects" on public.advertising_projects;
create policy "Admins delete projects"
  on public.advertising_projects for delete to authenticated
  using ((select public.is_project_admin()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('project-private-images', 'project-private-images', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins upload project images" on storage.objects;
create policy "Admins upload project images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'project-private-images' and (select public.is_project_admin()));

drop policy if exists "Admins update project images" on storage.objects;
create policy "Admins update project images"
  on storage.objects for update to authenticated
  using (bucket_id = 'project-private-images' and (select public.is_project_admin()))
  with check (bucket_id = 'project-private-images' and (select public.is_project_admin()));

drop policy if exists "Admins delete project images" on storage.objects;
create policy "Admins delete project images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'project-private-images' and (select public.is_project_admin()));

drop policy if exists "Published project images are readable" on storage.objects;
create policy "Published project images are readable"
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'project-private-images'
    and (
      (select public.is_project_admin())
      or exists (
        select 1 from public.advertising_projects p
        where p.estado = 'publicado'
          and p.imagen = name
      )
    )
  );
