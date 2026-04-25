create or replace function public.normalize_tr_text(value text)
returns text
language sql
immutable
as $$
  select replace(
    replace(
      replace(
        replace(
          replace(
            replace(lower(coalesce(value, '')), 'ö', 'o'),
            'ğ', 'g'
          ),
          'ı', 'i'
        ),
        'ü', 'u'
      ),
      'ş', 's'
    ),
    'ç', 'c'
  );
$$;

create or replace function public.is_active_parent_for_school(target_okul_id integer)
returns boolean
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
begin
  return exists (
    select 1
    from public.veliler v
    where v.user_id = auth.uid()
      and v.okul_id = target_okul_id
      and coalesce(v.aktif, true) = true
      and coalesce(v.iliski_tipi, 'parent') in ('parent', 'family')
  );
end;
$$;

create or replace function public.is_active_parent_of_student(target_ogrenci_id bigint)
returns boolean
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
begin
  return exists (
    select 1
    from public.veliler v
    where v.user_id = auth.uid()
      and v.ogrenci_id = target_ogrenci_id
      and coalesce(v.aktif, true) = true
      and coalesce(v.iliski_tipi, 'parent') in ('parent', 'family')
  );
end;
$$;

create or replace function public.is_admin_for_school(target_okul_id integer)
returns boolean
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
declare
  jwt_email text;
begin
  jwt_email := lower(coalesce(auth.jwt()->>'email', ''));

  return exists (
    select 1
    from public.personel p
    where p.okul_id = target_okul_id
      and coalesce(p.aktif, true) = true
      and public.normalize_tr_text(p.rol) similar to '%(admin|yonet|mudur|owner|kurucu)%'
      and (
        p.user_id = auth.uid()
        or (
          p.user_id is null
          and jwt_email <> ''
          and lower(coalesce(p.email, '')) = jwt_email
        )
      )
  );
end;
$$;

create or replace function public.is_teacher_for_class(target_okul_id integer, target_sinif text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
declare
  jwt_email text;
begin
  if btrim(coalesce(target_sinif, '')) = '' then
    return false;
  end if;

  jwt_email := lower(coalesce(auth.jwt()->>'email', ''));

  return exists (
    select 1
    from public.personel p
    where p.okul_id = target_okul_id
      and coalesce(p.aktif, true) = true
      and public.normalize_tr_text(p.rol) similar to '%(ogretmen|teacher)%'
      and public.normalize_tr_text(p.sinif) = public.normalize_tr_text(target_sinif)
      and (
        p.user_id = auth.uid()
        or (
          p.user_id is null
          and jwt_email <> ''
          and lower(coalesce(p.email, '')) = jwt_email
        )
      )
  );
end;
$$;

create or replace function public.is_teacher_for_student(target_okul_id integer, target_ogrenci_id bigint)
returns boolean
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
declare
  student_class text;
begin
  select o.sinif
  into student_class
  from public.ogrenciler o
  where o.id = target_ogrenci_id
    and o.okul_id = target_okul_id
    and coalesce(o.aktif, true) = true
  limit 1;

  return public.is_teacher_for_class(target_okul_id, student_class);
end;
$$;

drop policy if exists "veliler_select_self_or_school_staff" on public.veliler;
create policy "veliler_select_self_or_school_staff"
on public.veliler
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin_for_school(okul_id)
  or public.is_teacher_for_student(okul_id, ogrenci_id)
);

drop policy if exists "ogrenciler_select_school_staff_or_parent" on public.ogrenciler;
create policy "ogrenciler_select_school_staff_or_parent"
on public.ogrenciler
for select
to authenticated
using (
  public.is_admin_for_school(okul_id)
  or public.is_teacher_for_class(okul_id, sinif)
  or public.is_active_parent_of_student(id)
);

drop policy if exists "ogrenciler_insert_school_staff" on public.ogrenciler;
create policy "ogrenciler_insert_admin"
on public.ogrenciler
for insert
to authenticated
with check (public.is_admin_for_school(okul_id));

drop policy if exists "ogrenciler_update_school_staff" on public.ogrenciler;
create policy "ogrenciler_update_admin"
on public.ogrenciler
for update
to authenticated
using (public.is_admin_for_school(okul_id))
with check (public.is_admin_for_school(okul_id));

drop policy if exists "siniflar_select_school_users" on public.siniflar;
create policy "siniflar_select_school_users"
on public.siniflar
for select
to authenticated
using (
  public.is_admin_for_school(okul_id)
  or public.is_teacher_for_class(okul_id, ad)
  or public.is_active_parent_for_school(okul_id)
);

drop policy if exists "siniflar_manage_school_staff" on public.siniflar;
create policy "siniflar_manage_admin"
on public.siniflar
for all
to authenticated
using (public.is_admin_for_school(okul_id))
with check (public.is_admin_for_school(okul_id));

drop policy if exists "yoklama_select_school_staff_or_parent" on public.yoklama;
create policy "yoklama_select_teacher_admin_or_parent"
on public.yoklama
for select
to authenticated
using (
  public.is_admin_for_school(okul_id)
  or public.is_teacher_for_student(okul_id, ogrenci_id)
  or public.is_active_parent_of_student(ogrenci_id)
);

drop policy if exists "yoklama_manage_school_staff" on public.yoklama;
create policy "yoklama_manage_teacher_admin"
on public.yoklama
for all
to authenticated
using (
  public.is_admin_for_school(okul_id)
  or public.is_teacher_for_student(okul_id, ogrenci_id)
)
with check (
  public.is_admin_for_school(okul_id)
  or public.is_teacher_for_student(okul_id, ogrenci_id)
);

drop policy if exists "aktiviteler_select_school_staff_or_parent" on public.aktiviteler;
create policy "aktiviteler_select_teacher_admin_or_parent"
on public.aktiviteler
for select
to authenticated
using (
  public.is_admin_for_school(okul_id)
  or public.is_teacher_for_student(okul_id, ogrenci_id)
  or (
    public.is_active_parent_of_student(ogrenci_id)
    and coalesce(veli_gosterilsin, false) = true
  )
);

drop policy if exists "aktiviteler_manage_school_staff" on public.aktiviteler;
create policy "aktiviteler_manage_teacher_admin"
on public.aktiviteler
for all
to authenticated
using (
  public.is_admin_for_school(okul_id)
  or public.is_teacher_for_student(okul_id, ogrenci_id)
)
with check (
  public.is_admin_for_school(okul_id)
  or public.is_teacher_for_student(okul_id, ogrenci_id)
);

drop policy if exists "aidatlar_select_school_staff_or_parent" on public.aidatlar;
create policy "aidatlar_select_admin_or_parent"
on public.aidatlar
for select
to authenticated
using (
  public.is_admin_for_school(okul_id)
  or public.is_active_parent_of_student(ogrenci_id)
);

drop policy if exists "aidatlar_manage_school_staff" on public.aidatlar;
create policy "aidatlar_manage_admin"
on public.aidatlar
for all
to authenticated
using (public.is_admin_for_school(okul_id))
with check (public.is_admin_for_school(okul_id));

drop policy if exists "duyurular_insert_teacher_admin" on public.duyurular;
create policy "duyurular_insert_admin"
on public.duyurular
for insert
to authenticated
with check (public.is_admin_for_school(okul_id));

drop policy if exists "duyurular_update_teacher_admin" on public.duyurular;
create policy "duyurular_update_admin"
on public.duyurular
for update
to authenticated
using (public.is_admin_for_school(okul_id))
with check (public.is_admin_for_school(okul_id));

drop policy if exists "duyurular_delete_teacher_admin" on public.duyurular;
create policy "duyurular_delete_admin"
on public.duyurular
for delete
to authenticated
using (public.is_admin_for_school(okul_id));

drop policy if exists "mesajlar_select_school_users" on public.mesajlar;
create policy "mesajlar_select_teacher_admin_or_parent"
on public.mesajlar
for select
to authenticated
using (
  public.is_admin_for_school(okul_id)
  or public.is_teacher_for_student(okul_id, ogrenci_id)
  or public.is_active_parent_of_student(ogrenci_id)
);

drop policy if exists "mesajlar_insert_school_users" on public.mesajlar;
create policy "mesajlar_insert_teacher_admin_or_parent"
on public.mesajlar
for insert
to authenticated
with check (
  (
    gonderen_rol = 'admin'
    and public.is_admin_for_school(okul_id)
  )
  or (
    gonderen_rol = 'ogretmen'
    and public.is_teacher_for_student(okul_id, ogrenci_id)
  )
  or (
    gonderen_rol = 'veli'
    and public.is_active_parent_of_student(ogrenci_id)
  )
);

drop policy if exists "mesajlar_update_school_users" on public.mesajlar;
create policy "mesajlar_update_teacher_admin_or_parent"
on public.mesajlar
for update
to authenticated
using (
  public.is_admin_for_school(okul_id)
  or public.is_teacher_for_student(okul_id, ogrenci_id)
  or public.is_active_parent_of_student(ogrenci_id)
)
with check (
  public.is_admin_for_school(okul_id)
  or public.is_teacher_for_student(okul_id, ogrenci_id)
  or public.is_active_parent_of_student(ogrenci_id)
);

drop function if exists public.list_school_personel(integer);

create or replace function public.list_school_personel(target_okul_id integer)
returns table (
  id integer,
  okul_id integer,
  ad_soyad text,
  rol text,
  sinif text,
  telefon text,
  email text,
  aktif boolean,
  user_id uuid
)
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
begin
  if not public.is_admin_for_school(target_okul_id) then
    return;
  end if;

  return query
  select
    p.id,
    p.okul_id,
    p.ad_soyad,
    p.rol,
    p.sinif,
    p.telefon,
    p.email,
    coalesce(p.aktif, true) as aktif,
    p.user_id
  from public.personel p
  where p.okul_id = target_okul_id
  order by p.ad_soyad;
end;
$$;

alter function public.normalize_tr_text(text) owner to postgres;
alter function public.is_active_parent_for_school(integer) owner to postgres;
alter function public.is_active_parent_of_student(bigint) owner to postgres;
alter function public.is_admin_for_school(integer) owner to postgres;
alter function public.is_teacher_for_class(integer, text) owner to postgres;
alter function public.is_teacher_for_student(integer, bigint) owner to postgres;
alter function public.list_school_personel(integer) owner to postgres;
