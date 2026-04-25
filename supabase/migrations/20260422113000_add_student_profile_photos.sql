alter table public.ogrenciler
add column if not exists profil_foto_path text;

drop policy if exists "photos_select_school_scope" on storage.objects;
create policy "photos_select_school_scope"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'photos'
  and (
    (
      name ~ '^[0-9]+/[0-9]+/.+'
      and (
        public.is_admin_for_school(split_part(name, '/', 1)::integer)
        or public.is_teacher_for_student(split_part(name, '/', 1)::integer, split_part(name, '/', 2)::bigint)
      )
    )
    or exists (
      select 1
      from public.ogrenciler o
      where o.profil_foto_path = storage.objects.name
        and (
          public.is_admin_for_school(o.okul_id)
          or public.is_teacher_for_student(o.okul_id, o.id)
          or public.is_active_parent_of_student(o.id)
        )
    )
    or exists (
      select 1
      from public.aktiviteler a
      where coalesce(a.detay->>'storagePath', a.detay->>'path') = storage.objects.name
        and a.tur in ('photo', 'video')
        and (
          public.is_admin_for_school(a.okul_id)
          or public.is_teacher_for_student(a.okul_id, a.ogrenci_id)
          or (
            public.is_active_parent_of_student(a.ogrenci_id)
            and coalesce(a.veli_gosterilsin, false) = true
          )
        )
    )
  )
);
