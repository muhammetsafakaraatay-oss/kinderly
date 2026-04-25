create or replace function public.is_active_staff_for_school(target_okul_id integer)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.personel p
    where p.user_id = auth.uid()
      and p.okul_id = target_okul_id
      and coalesce(p.aktif, true) = true
  );
$$;

create or replace function public.is_active_parent_for_school(target_okul_id integer)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.veliler v
    where v.user_id = auth.uid()
      and v.okul_id = target_okul_id
      and coalesce(v.aktif, true) = true
  );
$$;

create or replace function public.is_active_parent_of_student(target_ogrenci_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.veliler v
    where v.user_id = auth.uid()
      and v.ogrenci_id = target_ogrenci_id
      and coalesce(v.aktif, true) = true
  );
$$;

create or replace function public.is_admin_for_school(target_okul_id integer)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.personel p
    where p.user_id = auth.uid()
      and p.okul_id = target_okul_id
      and coalesce(p.aktif, true) = true
      and lower(coalesce(p.rol, '')) similar to '%(admin|yonet|m[uü]d[uü]r|owner|kurucu)%'
  );
$$;

alter table if exists public.okullar enable row level security;
alter table if exists public.personel enable row level security;
alter table if exists public.veliler enable row level security;
alter table if exists public.ogrenciler enable row level security;
alter table if exists public.siniflar enable row level security;
alter table if exists public.yoklama enable row level security;
alter table if exists public.aktiviteler enable row level security;
alter table if exists public.aidatlar enable row level security;
alter table if exists public.duyurular enable row level security;
alter table if exists public.mesajlar enable row level security;
alter table if exists public.push_tokens enable row level security;
alter table if exists public.servis enable row level security;
alter table if exists public.servis_ogrenci enable row level security;

drop policy if exists "okullar_select_school_users" on public.okullar;
create policy "okullar_select_school_users"
on public.okullar
for select
to authenticated
using (
  public.is_active_staff_for_school(id)
  or public.is_active_parent_for_school(id)
);

drop policy if exists "okullar_update_admin" on public.okullar;
create policy "okullar_update_admin"
on public.okullar
for update
to authenticated
using (public.is_admin_for_school(id))
with check (public.is_admin_for_school(id));

drop policy if exists "personel_select_self_or_school_staff" on public.personel;
create policy "personel_select_self_or_school_staff"
on public.personel
for select
to authenticated
using (
  user_id = auth.uid()
  or lower(coalesce(email, '')) = lower(coalesce(auth.jwt()->>'email', ''))
  or public.is_active_staff_for_school(okul_id)
);

drop policy if exists "personel_insert_admin" on public.personel;
create policy "personel_insert_admin"
on public.personel
for insert
to authenticated
with check (public.is_admin_for_school(okul_id));

drop policy if exists "personel_update_admin" on public.personel;
create policy "personel_update_admin"
on public.personel
for update
to authenticated
using (public.is_admin_for_school(okul_id))
with check (public.is_admin_for_school(okul_id));

drop policy if exists "veliler_select_self_or_school_staff" on public.veliler;
create policy "veliler_select_self_or_school_staff"
on public.veliler
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_active_staff_for_school(okul_id)
);

drop policy if exists "veliler_insert_admin" on public.veliler;
create policy "veliler_insert_admin"
on public.veliler
for insert
to authenticated
with check (public.is_admin_for_school(okul_id));

drop policy if exists "veliler_update_admin" on public.veliler;
create policy "veliler_update_admin"
on public.veliler
for update
to authenticated
using (public.is_admin_for_school(okul_id))
with check (public.is_admin_for_school(okul_id));

drop policy if exists "ogrenciler_select_school_staff_or_parent" on public.ogrenciler;
create policy "ogrenciler_select_school_staff_or_parent"
on public.ogrenciler
for select
to authenticated
using (
  public.is_active_staff_for_school(okul_id)
  or public.is_active_parent_of_student(id)
);

drop policy if exists "ogrenciler_insert_school_staff" on public.ogrenciler;
create policy "ogrenciler_insert_school_staff"
on public.ogrenciler
for insert
to authenticated
with check (public.is_active_staff_for_school(okul_id));

drop policy if exists "ogrenciler_update_school_staff" on public.ogrenciler;
create policy "ogrenciler_update_school_staff"
on public.ogrenciler
for update
to authenticated
using (public.is_active_staff_for_school(okul_id))
with check (public.is_active_staff_for_school(okul_id));

drop policy if exists "siniflar_select_school_users" on public.siniflar;
create policy "siniflar_select_school_users"
on public.siniflar
for select
to authenticated
using (
  public.is_active_staff_for_school(okul_id)
  or public.is_active_parent_for_school(okul_id)
);

drop policy if exists "siniflar_manage_school_staff" on public.siniflar;
create policy "siniflar_manage_school_staff"
on public.siniflar
for all
to authenticated
using (public.is_active_staff_for_school(okul_id))
with check (public.is_active_staff_for_school(okul_id));

drop policy if exists "yoklama_select_school_staff_or_parent" on public.yoklama;
create policy "yoklama_select_school_staff_or_parent"
on public.yoklama
for select
to authenticated
using (
  public.is_active_staff_for_school(okul_id)
  or public.is_active_parent_of_student(ogrenci_id)
);

drop policy if exists "yoklama_manage_school_staff" on public.yoklama;
create policy "yoklama_manage_school_staff"
on public.yoklama
for all
to authenticated
using (public.is_active_staff_for_school(okul_id))
with check (public.is_active_staff_for_school(okul_id));

drop policy if exists "aktiviteler_select_school_staff_or_parent" on public.aktiviteler;
create policy "aktiviteler_select_school_staff_or_parent"
on public.aktiviteler
for select
to authenticated
using (
  public.is_active_staff_for_school(okul_id)
  or (
    public.is_active_parent_of_student(ogrenci_id)
    and coalesce(veli_gosterilsin, false) = true
  )
);

drop policy if exists "aktiviteler_manage_school_staff" on public.aktiviteler;
create policy "aktiviteler_manage_school_staff"
on public.aktiviteler
for all
to authenticated
using (public.is_active_staff_for_school(okul_id))
with check (public.is_active_staff_for_school(okul_id));

drop policy if exists "aidatlar_select_school_staff_or_parent" on public.aidatlar;
create policy "aidatlar_select_school_staff_or_parent"
on public.aidatlar
for select
to authenticated
using (
  public.is_active_staff_for_school(okul_id)
  or public.is_active_parent_of_student(ogrenci_id)
);

drop policy if exists "aidatlar_manage_school_staff" on public.aidatlar;
create policy "aidatlar_manage_school_staff"
on public.aidatlar
for all
to authenticated
using (public.is_active_staff_for_school(okul_id))
with check (public.is_active_staff_for_school(okul_id));

drop policy if exists "duyurular_select_school_users" on public.duyurular;
create policy "duyurular_select_school_users"
on public.duyurular
for select
to authenticated
using (
  public.is_active_staff_for_school(okul_id)
  or public.is_active_parent_for_school(okul_id)
);

drop policy if exists "duyurular_insert_teacher_admin" on public.duyurular;
create policy "duyurular_insert_teacher_admin"
on public.duyurular
for insert
to authenticated
with check (public.is_active_staff_for_school(okul_id));

drop policy if exists "duyurular_update_teacher_admin" on public.duyurular;
create policy "duyurular_update_teacher_admin"
on public.duyurular
for update
to authenticated
using (public.is_active_staff_for_school(okul_id))
with check (public.is_active_staff_for_school(okul_id));

drop policy if exists "duyurular_delete_teacher_admin" on public.duyurular;
create policy "duyurular_delete_teacher_admin"
on public.duyurular
for delete
to authenticated
using (public.is_active_staff_for_school(okul_id));

drop policy if exists "mesajlar_select_school_users" on public.mesajlar;
create policy "mesajlar_select_school_users"
on public.mesajlar
for select
to authenticated
using (
  public.is_active_staff_for_school(okul_id)
  or public.is_active_parent_of_student(ogrenci_id)
);

drop policy if exists "mesajlar_insert_school_users" on public.mesajlar;
create policy "mesajlar_insert_school_users"
on public.mesajlar
for insert
to authenticated
with check (
  (
    gonderen_rol in ('ogretmen', 'admin')
    and public.is_active_staff_for_school(okul_id)
  )
  or (
    gonderen_rol = 'veli'
    and public.is_active_parent_of_student(ogrenci_id)
  )
);

drop policy if exists "mesajlar_update_school_users" on public.mesajlar;
create policy "mesajlar_update_school_users"
on public.mesajlar
for update
to authenticated
using (
  public.is_active_staff_for_school(okul_id)
  or public.is_active_parent_of_student(ogrenci_id)
)
with check (
  public.is_active_staff_for_school(okul_id)
  or public.is_active_parent_of_student(ogrenci_id)
);

drop policy if exists "push_tokens_manage_own" on public.push_tokens;
create policy "push_tokens_manage_own"
on public.push_tokens
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "servis_select_school_staff" on public.servis;
create policy "servis_select_school_staff"
on public.servis
for select
to authenticated
using (public.is_active_staff_for_school(okul_id));

drop policy if exists "servis_manage_school_staff" on public.servis;
create policy "servis_manage_school_staff"
on public.servis
for all
to authenticated
using (public.is_active_staff_for_school(okul_id))
with check (public.is_active_staff_for_school(okul_id));

drop policy if exists "servis_ogrenci_select_school_staff" on public.servis_ogrenci;
create policy "servis_ogrenci_select_school_staff"
on public.servis_ogrenci
for select
to authenticated
using (
  exists (
    select 1
    from public.servis s
    where s.id = servis_ogrenci.servis_id
      and public.is_active_staff_for_school(s.okul_id)
  )
);

drop policy if exists "servis_ogrenci_manage_school_staff" on public.servis_ogrenci;
create policy "servis_ogrenci_manage_school_staff"
on public.servis_ogrenci
for all
to authenticated
using (
  exists (
    select 1
    from public.servis s
    where s.id = servis_ogrenci.servis_id
      and public.is_active_staff_for_school(s.okul_id)
  )
)
with check (
  exists (
    select 1
    from public.servis s
    where s.id = servis_ogrenci.servis_id
      and public.is_active_staff_for_school(s.okul_id)
  )
);
