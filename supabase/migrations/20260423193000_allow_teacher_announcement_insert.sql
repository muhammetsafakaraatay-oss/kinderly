create or replace function public.is_teacher_for_school(target_okul_id integer)
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
      and public.normalize_tr_text(p.rol) similar to '%(ogretmen|teacher)%'
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

drop policy if exists "duyurular_insert_admin" on public.duyurular;
drop policy if exists "duyurular_insert_teacher_admin" on public.duyurular;
create policy "duyurular_insert_teacher_admin"
on public.duyurular
for insert
to authenticated
with check (
  public.is_admin_for_school(okul_id)
  or public.is_teacher_for_school(okul_id)
);

alter function public.is_teacher_for_school(integer) owner to postgres;
