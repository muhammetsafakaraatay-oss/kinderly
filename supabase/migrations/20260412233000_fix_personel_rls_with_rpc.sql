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
    p.telefon,
    p.email,
    coalesce(p.aktif, true) as aktif,
    p.user_id
  from public.personel p
  where p.okul_id = target_okul_id
  order by p.ad_soyad;
end;
$$;

alter function public.list_school_personel(integer) owner to postgres;

drop policy if exists "personel_select_self_or_school_staff" on public.personel;
create policy "personel_select_self_only"
on public.personel
for select
to authenticated
using (
  user_id = auth.uid()
  or lower(coalesce(email, '')) = lower(coalesce(auth.jwt()->>'email', ''))
);
