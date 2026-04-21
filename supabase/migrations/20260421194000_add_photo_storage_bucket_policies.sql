insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos',
  'photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "storage_photos_select_school_only" on storage.objects;
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
        and a.tur = 'photo'
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

drop policy if exists "storage_photos_write_staff_only" on storage.objects;
drop policy if exists "photos_insert_staff" on storage.objects;
create policy "photos_insert_staff"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'photos'
  and name ~ '^[0-9]+/[0-9]+/.+'
  and private.is_staff_of_school(split_part(name, '/', 1)::bigint)
);

drop policy if exists "photos_update_staff" on storage.objects;
create policy "photos_update_staff"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'photos'
  and name ~ '^[0-9]+/[0-9]+/.+'
  and private.is_staff_of_school(split_part(name, '/', 1)::bigint)
)
with check (
  bucket_id = 'photos'
  and name ~ '^[0-9]+/[0-9]+/.+'
  and private.is_staff_of_school(split_part(name, '/', 1)::bigint)
);

drop policy if exists "photos_delete_staff" on storage.objects;
create policy "photos_delete_staff"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'photos'
  and name ~ '^[0-9]+/[0-9]+/.+'
  and private.is_staff_of_school(split_part(name, '/', 1)::bigint)
);
