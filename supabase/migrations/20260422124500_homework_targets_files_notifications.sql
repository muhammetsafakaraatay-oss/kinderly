alter table public.evraklar
add column if not exists hedef text not null default 'all',
add column if not exists sinif text,
add column if not exists ogrenci_id bigint references public.ogrenciler(id) on delete cascade,
add column if not exists dosya_path text,
add column if not exists dosya_ad text,
add column if not exists dosya_mime text;

alter table public.okul_etkinlikleri
add column if not exists ogrenci_id bigint references public.ogrenciler(id) on delete cascade;

alter table public.evrak_onaylari
add column if not exists yorum text,
add column if not exists updated_at timestamptz not null default now();

create table if not exists public.bildirim_okumalari (
  id bigserial primary key,
  okul_id integer not null references public.okullar(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  item_key text not null,
  read_at timestamptz not null default now(),
  unique (okul_id, user_id, item_key)
);

alter table public.bildirim_okumalari enable row level security;

create index if not exists idx_evraklar_target
  on public.evraklar (okul_id, hedef, sinif, ogrenci_id);

create index if not exists idx_okul_etkinlikleri_target
  on public.okul_etkinlikleri (okul_id, hedef, sinif, ogrenci_id);

create index if not exists idx_bildirim_okumalari_user
  on public.bildirim_okumalari (okul_id, user_id, item_key);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'homework',
  'homework',
  false,
  26214400,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "evraklar_select_school_users" on public.evraklar;
create policy "evraklar_select_school_users"
on public.evraklar
for select
to authenticated
using (
  public.is_admin_for_school(okul_id)
  or exists (
    select 1 from public.personel p
    where p.okul_id = evraklar.okul_id
      and p.user_id = auth.uid()
      and coalesce(p.aktif, true) = true
  )
  or exists (
    select 1
    from public.veliler v
    join public.ogrenciler o on o.id = v.ogrenci_id
    where v.okul_id = evraklar.okul_id
      and v.user_id = auth.uid()
      and coalesce(v.aktif, true) = true
      and coalesce(v.iliski_tipi, 'parent') in ('parent', 'family')
      and (
        coalesce(evraklar.hedef, 'all') = 'all'
        or (evraklar.hedef = 'class' and evraklar.sinif is not null and o.sinif = evraklar.sinif)
        or (evraklar.hedef = 'student' and evraklar.ogrenci_id = o.id)
      )
  )
);

drop policy if exists "okul_etkinlikleri_select_school_users" on public.okul_etkinlikleri;
create policy "okul_etkinlikleri_select_school_users"
on public.okul_etkinlikleri
for select
to authenticated
using (
  public.is_admin_for_school(okul_id)
  or exists (
    select 1 from public.personel p
    where p.okul_id = okul_etkinlikleri.okul_id
      and p.user_id = auth.uid()
      and coalesce(p.aktif, true) = true
  )
  or exists (
    select 1
    from public.veliler v
    join public.ogrenciler o on o.id = v.ogrenci_id
    where v.okul_id = okul_etkinlikleri.okul_id
      and v.user_id = auth.uid()
      and coalesce(v.aktif, true) = true
      and coalesce(v.iliski_tipi, 'parent') in ('parent', 'family')
      and (
        coalesce(okul_etkinlikleri.hedef, 'all') = 'all'
        or (okul_etkinlikleri.hedef = 'class' and okul_etkinlikleri.sinif is not null and o.sinif = okul_etkinlikleri.sinif)
        or (okul_etkinlikleri.hedef = 'student' and okul_etkinlikleri.ogrenci_id = o.id)
      )
  )
);

drop policy if exists "evrak_onaylari_parent_upsert" on public.evrak_onaylari;
create policy "evrak_onaylari_parent_upsert"
on public.evrak_onaylari
for insert
to authenticated
with check (
  veli_user_id = auth.uid()
  and public.is_active_parent_of_student(ogrenci_id)
  and exists (
    select 1
    from public.evraklar e
    join public.ogrenciler o on o.id = evrak_onaylari.ogrenci_id
    where e.id = evrak_onaylari.evrak_id
      and e.okul_id = evrak_onaylari.okul_id
      and (
        coalesce(e.hedef, 'all') = 'all'
        or (e.hedef = 'class' and e.sinif is not null and o.sinif = e.sinif)
        or (e.hedef = 'student' and e.ogrenci_id = evrak_onaylari.ogrenci_id)
      )
  )
);

drop policy if exists "bildirim_okumalari_select_own" on public.bildirim_okumalari;
create policy "bildirim_okumalari_select_own"
on public.bildirim_okumalari
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "bildirim_okumalari_insert_own" on public.bildirim_okumalari;
create policy "bildirim_okumalari_insert_own"
on public.bildirim_okumalari
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "bildirim_okumalari_update_own" on public.bildirim_okumalari;
create policy "bildirim_okumalari_update_own"
on public.bildirim_okumalari
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "homework_select_school_scope" on storage.objects;
create policy "homework_select_school_scope"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'homework'
  and exists (
    select 1
    from public.evraklar e
    where e.dosya_path = storage.objects.name
      and (
        public.is_admin_for_school(e.okul_id)
        or exists (
          select 1 from public.personel p
          where p.okul_id = e.okul_id
            and p.user_id = auth.uid()
            and coalesce(p.aktif, true) = true
        )
        or exists (
          select 1
          from public.veliler v
          join public.ogrenciler o on o.id = v.ogrenci_id
          where v.okul_id = e.okul_id
            and v.user_id = auth.uid()
            and coalesce(v.aktif, true) = true
            and coalesce(v.iliski_tipi, 'parent') in ('parent', 'family')
            and (
              coalesce(e.hedef, 'all') = 'all'
              or (e.hedef = 'class' and e.sinif is not null and o.sinif = e.sinif)
              or (e.hedef = 'student' and e.ogrenci_id = o.id)
            )
        )
      )
  )
);

drop policy if exists "homework_insert_admin" on storage.objects;
create policy "homework_insert_admin"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'homework'
  and name ~ '^[0-9]+/.+'
  and public.is_admin_for_school(split_part(name, '/', 1)::integer)
);

drop policy if exists "homework_update_admin" on storage.objects;
create policy "homework_update_admin"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'homework'
  and name ~ '^[0-9]+/.+'
  and public.is_admin_for_school(split_part(name, '/', 1)::integer)
)
with check (
  bucket_id = 'homework'
  and name ~ '^[0-9]+/.+'
  and public.is_admin_for_school(split_part(name, '/', 1)::integer)
);

drop policy if exists "homework_delete_admin" on storage.objects;
create policy "homework_delete_admin"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'homework'
  and name ~ '^[0-9]+/.+'
  and public.is_admin_for_school(split_part(name, '/', 1)::integer)
);
