-- Extend the existing GAM+ project schema to match the ER/CRUD PDF.
-- Existing projects, legacy image paths, admin membership and Storage objects are retained.

create table if not exists public.roles (
  rol_id uuid primary key default gen_random_uuid(),
  nombre text not null unique check (length(trim(nombre)) between 1 and 80)
);

create table if not exists public.accounts (
  cuenta_id uuid primary key default gen_random_uuid(),
  rol_id uuid not null references public.roles(rol_id) on delete restrict,
  identidad_autenticada uuid not null unique references auth.users(id) on delete cascade
);

insert into public.roles (nombre)
values ('usuario'), ('administrador')
on conflict (nombre) do nothing;

-- Existing Auth identities receive the least-privileged role. No user can promote itself.
insert into public.accounts (rol_id, identidad_autenticada)
select r.rol_id, u.id
from auth.users u
cross join public.roles r
where r.nombre = 'usuario'
on conflict (identidad_autenticada) do nothing;

-- Preserve administrators previously assigned through admin_users.
insert into public.accounts (rol_id, identidad_autenticada)
select r.rol_id, a.user_id
from public.admin_users a
cross join public.roles r
where r.nombre = 'administrador'
on conflict (identidad_autenticada) do update
set rol_id = excluded.rol_id;

alter table public.roles enable row level security;
alter table public.accounts enable row level security;
revoke all on public.roles from public, anon, authenticated;
revoke all on public.accounts from public, anon, authenticated;

create or replace function public.assign_default_role_to_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.accounts (rol_id, identidad_autenticada)
  select r.rol_id, new.id
  from public.roles r
  where r.nombre = 'usuario'
  on conflict (identidad_autenticada) do nothing;
  return new;
end;
$$;

revoke all on function public.assign_default_role_to_new_user() from public, anon, authenticated;
drop trigger if exists assign_default_role_after_signup on auth.users;
create trigger assign_default_role_after_signup
  after insert on auth.users
  for each row execute function public.assign_default_role_to_new_user();

create or replace function public.is_project_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.accounts a
    join public.roles r on r.rol_id = a.rol_id
    where a.identidad_autenticada = (select auth.uid())
      and r.nombre = 'administrador'
  );
$$;

revoke all on function public.is_project_admin() from public;
grant execute on function public.is_project_admin() to anon, authenticated;

alter table public.advertising_projects
  add column if not exists creado_en timestamptz not null default now();

-- Retain the legacy fields and their values while the app moves to the ER model.
update public.advertising_projects
set creado_en = fecha::timestamp at time zone 'UTC'
where fecha is not null;

alter table public.advertising_projects alter column imagen drop not null;

create table if not exists public.project_files (
  archivo_id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.advertising_projects(id) on delete restrict,
  clave_almacenamiento text not null check (length(trim(clave_almacenamiento)) between 1 and 1000),
  unique (proyecto_id, clave_almacenamiento)
);

create index if not exists project_files_project_id_idx
  on public.project_files (proyecto_id);

-- Extract a private-bucket object key from legacy Supabase object URLs without retaining signed tokens.
create or replace function public.project_private_storage_path(reference text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  parts text[];
  encoded_path text;
  decoded_path bytea := ''::bytea;
  path_index integer := 1;
begin
  parts := regexp_match(
    reference,
    '^https?://[^/]+/storage/v1/object/(sign|authenticated|public)/project-private-images/([^?]+)'
  );
  if parts is null then
    return null;
  end if;

  encoded_path := parts[2];
  while path_index <= length(encoded_path) loop
    if substr(encoded_path, path_index, 1) = '%'
      and substr(encoded_path, path_index + 1, 2) ~ '^[0-9A-Fa-f]{2}$' then
      decoded_path := decoded_path || decode(substr(encoded_path, path_index + 1, 2), 'hex');
      path_index := path_index + 3;
    else
      decoded_path := decoded_path || convert_to(substr(encoded_path, path_index, 1), 'UTF8');
      path_index := path_index + 1;
    end if;
  end loop;

  return convert_from(decoded_path, 'UTF8');
end;
$$;

revoke all on function public.project_private_storage_path(text) from public;
grant execute on function public.project_private_storage_path(text) to anon, authenticated;

-- Convert existing private-bucket paths/URLs into related file records. External URLs stay legacy references.
insert into public.project_files (proyecto_id, clave_almacenamiento)
select p.id, coalesce(
  public.project_private_storage_path(trim(p.imagen)),
  trim(p.imagen)
)
from public.advertising_projects p
where p.imagen is not null
  and length(trim(p.imagen)) > 0
  and (
    trim(p.imagen) !~* '^https?://'
    or public.project_private_storage_path(trim(p.imagen)) is not null
  )
on conflict (proyecto_id, clave_almacenamiento) do nothing;

alter table public.project_files enable row level security;
revoke all on public.project_files from public, anon, authenticated;
grant select on public.project_files to anon, authenticated;
grant insert, update, delete on public.project_files to authenticated;

drop policy if exists "Published project files are readable" on public.project_files;
create policy "Published project files are readable"
  on public.project_files for select to anon, authenticated
  using (
    (select public.is_project_admin())
    or exists (
      select 1 from public.advertising_projects p
      where p.id = proyecto_id and p.estado = 'publicado'
    )
  );

drop policy if exists "Admins add project files" on public.project_files;
create policy "Admins add project files"
  on public.project_files for insert to authenticated
  with check ((select public.is_project_admin()));

drop policy if exists "Admins update project files" on public.project_files;
create policy "Admins update project files"
  on public.project_files for update to authenticated
  using ((select public.is_project_admin()))
  with check ((select public.is_project_admin()));

drop policy if exists "Admins delete project files" on public.project_files;
create policy "Admins delete project files"
  on public.project_files for delete to authenticated
  using ((select public.is_project_admin()));

drop policy if exists "Published project images are readable" on storage.objects;
create policy "Published project images are readable"
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'project-private-images'
    and (
      (select public.is_project_admin())
      or exists (
        select 1
        from public.project_files f
        join public.advertising_projects p on p.id = f.proyecto_id
        where f.clave_almacenamiento = name
          and p.estado = 'publicado'
      )
      or exists (
        select 1 from public.advertising_projects p
        where p.estado = 'publicado' and p.imagen = name
      )
    )
  );

-- Preserve the eight public portfolio examples already shipped by the React app.
-- Insert only missing title/category pairs; never overwrite existing project content.
insert into public.advertising_projects (titulo, descripcion, categoria, imagen, estado)
select source.titulo, source.descripcion, source.categoria, source.imagen, 'publicado'
from (values
  ('Campaña integral', 'Propuesta integral de campaña.', 'publicidad', 'https://i.pinimg.com/736x/a6/28/0c/a6280cd98d4304d7d7fe69f61c9dda4c.jpg'),
  ('Campaña seasonal', 'Propuesta temática y estacional.', 'publicidad', 'https://i.pinimg.com/1200x/de/40/2f/de402f1d38028464a895a9c9eaaada9e.jpg'),
  ('Estrategia de contenido', 'Contenido estratégico para redes.', 'redes', 'https://i.pinimg.com/736x/cd/a8/06/cda806e2ffdf40916c04f6af5d617c44.jpg'),
  ('Sistema de marca', 'Identidad visual completa.', 'branding', 'https://i.pinimg.com/736x/a9/8a/f7/a98af7b7b08bf90f1438cdcf7ca3f6cb.jpg'),
  ('Colaboración influencers', 'Estrategia con personalidades.', 'redes', 'https://i.pinimg.com/1200x/39/42/99/39429970a729a2e74a7c1fe50bdb5164.jpg'),
  ('Aplicación de marca', 'Recursos en múltiples soportes.', 'diseno', 'https://i.pinimg.com/736x/f5/e6/9d/f5e69d1dad12d6a366767efed602e1b0.jpg'),
  ('Rediseño corporativo', 'Actualización de identidad.', 'branding', 'https://i.pinimg.com/736x/62/e0/32/62e03262ea4dee4031c4ed0d00a447cc.jpg'),
  ('Packaging innovador', 'Solución creativa de empaque.', 'diseno', 'https://i.pinimg.com/1200x/a0/3c/89/a03c89075db65d8d5ba481dceb82ecba.jpg')
) as source(titulo, descripcion, categoria, imagen)
where not exists (
  select 1 from public.advertising_projects existing
  where lower(trim(existing.titulo)) = lower(trim(source.titulo))
    and existing.categoria = source.categoria
);
