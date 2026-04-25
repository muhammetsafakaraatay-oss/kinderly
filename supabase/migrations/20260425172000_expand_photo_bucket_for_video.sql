update storage.buckets
set
  file_size_limit = 52428800,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/x-m4v'
  ]
where id = 'photos';

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
      and private.is_staff_of_school(split_part(name, '/', 1)::bigint)
    )
    or exists (
      select 1
      from public.aktiviteler a
      where coalesce(a.detay->>'storagePath', a.detay->>'path') = storage.objects.name
        and a.tur in ('photo', 'video')
        and (
          private.is_staff_of_school(a.okul_id)
          or (
            private.parent_has_student(a.ogrenci_id)
            and coalesce(a.veli_gosterilsin, false) = true
          )
        )
    )
  )
);
