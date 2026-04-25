create or replace function public.is_active_staff_for_school(target_okul_id integer)
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
    from public.personel p
    where p.user_id = auth.uid()
      and p.okul_id = target_okul_id
      and coalesce(p.aktif, true) = true
  );
end;
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
begin
  return exists (
    select 1
    from public.personel p
    where p.user_id = auth.uid()
      and p.okul_id = target_okul_id
      and coalesce(p.aktif, true) = true
      and lower(coalesce(p.rol, '')) similar to '%(admin|yonet|m[uü]d[uü]r|owner|kurucu)%'
  );
end;
$$;

alter function public.is_active_staff_for_school(integer) owner to postgres;
alter function public.is_active_parent_for_school(integer) owner to postgres;
alter function public.is_active_parent_of_student(bigint) owner to postgres;
alter function public.is_admin_for_school(integer) owner to postgres;
