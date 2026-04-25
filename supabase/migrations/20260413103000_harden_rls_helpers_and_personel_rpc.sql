create or replace function public.is_active_staff_for_school(target_okul_id integer)
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
      and lower(coalesce(p.rol, '')) similar to '%(admin|yonet|m[uü]d[uü]r|owner|kurucu)%'
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

alter function public.is_active_staff_for_school(integer) owner to postgres;
alter function public.is_admin_for_school(integer) owner to postgres;

drop function if exists public.list_school_personel(integer);

create or replace function public.list_school_personel(target_okul_id integer)
returns table (
  id integer,
  okul_id integer,
  ad_soyad text,
  rol text,
  sinif text,
  email text,
  aktif boolean
)
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
begin
  if not public.is_active_staff_for_school(target_okul_id) then
    return;
  end if;

  return query
  select
    p.id,
    p.okul_id,
    p.ad_soyad,
    p.rol,
    p.sinif,
    p.email,
    coalesce(p.aktif, true) as aktif
  from public.personel p
  where p.okul_id = target_okul_id
  order by p.ad_soyad;
end;
$$;

alter function public.list_school_personel(integer) owner to postgres;
