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
