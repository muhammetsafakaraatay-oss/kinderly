create table if not exists public.okul_etkinlikleri (
  id bigserial primary key,
  okul_id integer not null references public.okullar(id) on delete cascade,
  baslik text not null,
  aciklama text,
  baslangic_tarihi date not null,
  bitis_tarihi date,
  saat text,
  hedef text not null default 'all',
  sinif text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.evraklar (
  id bigserial primary key,
  okul_id integer not null references public.okullar(id) on delete cascade,
  baslik text not null,
  aciklama text,
  belge_url text,
  zorunlu boolean not null default true,
  son_tarih date,
  aktif boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.evrak_onaylari (
  id bigserial primary key,
  evrak_id bigint not null references public.evraklar(id) on delete cascade,
  okul_id integer not null references public.okullar(id) on delete cascade,
  ogrenci_id bigint not null references public.ogrenciler(id) on delete cascade,
  veli_user_id uuid not null references auth.users(id) on delete cascade,
  durum text not null default 'onaylandi',
  onaylandi_at timestamptz not null default now(),
  unique (evrak_id, ogrenci_id, veli_user_id)
);

create table if not exists public.teslim_kayitlari (
  id bigserial primary key,
  okul_id integer not null references public.okullar(id) on delete cascade,
  ogrenci_id bigint not null references public.ogrenciler(id) on delete cascade,
  tip text not null check (tip in ('check_in', 'check_out')),
  teslim_alan_ad text,
  teslim_alan_yakinlik text,
  teslim_pin text,
  notlar text,
  kaydeden_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_okul_etkinlikleri_okul_tarih
  on public.okul_etkinlikleri (okul_id, baslangic_tarihi desc);

create index if not exists idx_evraklar_okul_active
  on public.evraklar (okul_id, aktif, created_at desc);

create index if not exists idx_evrak_onaylari_parent
  on public.evrak_onaylari (veli_user_id, ogrenci_id);

create index if not exists idx_teslim_kayitlari_okul_student
  on public.teslim_kayitlari (okul_id, ogrenci_id, created_at desc);

alter table public.okul_etkinlikleri enable row level security;
alter table public.evraklar enable row level security;
alter table public.evrak_onaylari enable row level security;
alter table public.teslim_kayitlari enable row level security;

drop policy if exists "okul_etkinlikleri_select_school_users" on public.okul_etkinlikleri;
create policy "okul_etkinlikleri_select_school_users"
on public.okul_etkinlikleri
for select
to authenticated
using (
  public.is_admin_for_school(okul_id)
  or public.is_active_parent_for_school(okul_id)
  or exists (
    select 1 from public.personel p
    where p.okul_id = okul_etkinlikleri.okul_id
      and p.user_id = auth.uid()
      and coalesce(p.aktif, true) = true
  )
);

drop policy if exists "okul_etkinlikleri_manage_admin" on public.okul_etkinlikleri;
create policy "okul_etkinlikleri_manage_admin"
on public.okul_etkinlikleri
for all
to authenticated
using (public.is_admin_for_school(okul_id))
with check (public.is_admin_for_school(okul_id));

drop policy if exists "evraklar_select_school_users" on public.evraklar;
create policy "evraklar_select_school_users"
on public.evraklar
for select
to authenticated
using (
  public.is_admin_for_school(okul_id)
  or public.is_active_parent_for_school(okul_id)
  or exists (
    select 1 from public.personel p
    where p.okul_id = evraklar.okul_id
      and p.user_id = auth.uid()
      and coalesce(p.aktif, true) = true
  )
);

drop policy if exists "evraklar_manage_admin" on public.evraklar;
create policy "evraklar_manage_admin"
on public.evraklar
for all
to authenticated
using (public.is_admin_for_school(okul_id))
with check (public.is_admin_for_school(okul_id));

drop policy if exists "evrak_onaylari_select_school_scope" on public.evrak_onaylari;
create policy "evrak_onaylari_select_school_scope"
on public.evrak_onaylari
for select
to authenticated
using (
  veli_user_id = auth.uid()
  or public.is_admin_for_school(okul_id)
  or public.is_teacher_for_student(okul_id, ogrenci_id)
);

drop policy if exists "evrak_onaylari_parent_upsert" on public.evrak_onaylari;
create policy "evrak_onaylari_parent_upsert"
on public.evrak_onaylari
for insert
to authenticated
with check (
  veli_user_id = auth.uid()
  and public.is_active_parent_of_student(ogrenci_id)
);

drop policy if exists "evrak_onaylari_parent_update" on public.evrak_onaylari;
create policy "evrak_onaylari_parent_update"
on public.evrak_onaylari
for update
to authenticated
using (veli_user_id = auth.uid())
with check (veli_user_id = auth.uid());

drop policy if exists "teslim_kayitlari_select_school_scope" on public.teslim_kayitlari;
create policy "teslim_kayitlari_select_school_scope"
on public.teslim_kayitlari
for select
to authenticated
using (
  public.is_admin_for_school(okul_id)
  or public.is_teacher_for_student(okul_id, ogrenci_id)
  or public.is_active_parent_of_student(ogrenci_id)
);

drop policy if exists "teslim_kayitlari_insert_staff" on public.teslim_kayitlari;
create policy "teslim_kayitlari_insert_staff"
on public.teslim_kayitlari
for insert
to authenticated
with check (
  public.is_admin_for_school(okul_id)
  or public.is_teacher_for_student(okul_id, ogrenci_id)
);

drop policy if exists "teslim_kayitlari_update_admin" on public.teslim_kayitlari;
create policy "teslim_kayitlari_update_admin"
on public.teslim_kayitlari
for update
to authenticated
using (public.is_admin_for_school(okul_id))
with check (public.is_admin_for_school(okul_id));

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
    'video/quicktime'
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
      and (
        public.is_admin_for_school(split_part(name, '/', 1)::integer)
        or public.is_teacher_for_student(split_part(name, '/', 1)::integer, split_part(name, '/', 2)::bigint)
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
