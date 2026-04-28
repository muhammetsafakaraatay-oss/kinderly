create table if not exists public.organization_invites (
  id bigserial primary key,
  okul_id integer not null references public.okullar(id) on delete cascade,
  invite_type text not null check (invite_type in ('staff', 'organization')),
  email text not null,
  phone text,
  target_role text not null check (target_role in ('admin', 'ogretmen', 'mudur', 'yardimci', 'veli')),
  token text not null,
  full_name text,
  class_name text,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_organization_invites_token
  on public.organization_invites (token);

create index if not exists idx_organization_invites_school_email
  on public.organization_invites (okul_id, lower(email), created_at desc);

alter table public.organization_invites enable row level security;

drop policy if exists "organization_invites_select_admin_scope" on public.organization_invites;
create policy "organization_invites_select_admin_scope"
on public.organization_invites
for select
to authenticated
using (public.is_admin_for_school(okul_id));

drop policy if exists "organization_invites_insert_admin_scope" on public.organization_invites;
create policy "organization_invites_insert_admin_scope"
on public.organization_invites
for insert
to authenticated
with check (public.is_admin_for_school(okul_id));

drop policy if exists "organization_invites_update_admin_scope" on public.organization_invites;
create policy "organization_invites_update_admin_scope"
on public.organization_invites
for update
to authenticated
using (public.is_admin_for_school(okul_id))
with check (public.is_admin_for_school(okul_id));
