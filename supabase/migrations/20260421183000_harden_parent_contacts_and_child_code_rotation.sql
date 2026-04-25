create or replace function public.rotate_child_link_code(target_ogrenci_id bigint)
returns text
language plpgsql
volatile
security definer
set search_path = public
set row_security = off
as $$
declare
  student_school_id integer;
  next_code text;
begin
  select o.okul_id
  into student_school_id
  from public.ogrenciler o
  where o.id = target_ogrenci_id
    and coalesce(o.aktif, true) = true
  limit 1;

  if student_school_id is null then
    raise exception 'Öğrenci kaydı bulunamadı.';
  end if;

  if not (
    public.is_admin_for_school(student_school_id)
    or public.is_parent_contact_of_student(target_ogrenci_id)
  ) then
    raise exception 'Bu çocuk kodunu yenileme yetkiniz yok.';
  end if;

  next_code := public.generate_child_link_code();

  update public.ogrenciler
  set
    baglanti_kodu = next_code,
    baglanti_kodu_olusturuldu_at = now()
  where id = target_ogrenci_id;

  return next_code;
end;
$$;

drop policy if exists "veliler_update_admin_or_parent" on public.veliler;
create policy "veliler_update_admin_or_parent"
on public.veliler
for update
to authenticated
using (
  public.is_admin_for_school(okul_id)
  or (
    public.is_parent_contact_of_student(ogrenci_id)
    and coalesce(iliski_tipi, 'family') in ('family', 'approved_pickup', 'emergency')
  )
)
with check (
  public.is_admin_for_school(okul_id)
  or (
    public.is_parent_contact_of_student(ogrenci_id)
    and coalesce(iliski_tipi, 'family') in ('family', 'approved_pickup', 'emergency')
    and user_id is null
  )
);

alter function public.rotate_child_link_code(bigint) owner to postgres;
