create schema if not exists private;

create or replace function private.is_admin_of_school(target_okul_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from personel
    where user_id = auth.uid()
      and okul_id = target_okul_id
      and coalesce(aktif, true) = true
      and lower(coalesce(rol, '')) = 'admin'
  );
$$;

create or replace function private.is_staff_of_school(target_okul_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from personel
    where user_id = auth.uid()
      and okul_id = target_okul_id
      and coalesce(aktif, true) = true
      and lower(coalesce(rol, '')) in ('admin', 'ogretmen', 'yardimci', 'mudur')
  );
$$;

create or replace function private.is_parent_of_school(target_okul_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from veliler
    where user_id = auth.uid()
      and okul_id = target_okul_id
      and coalesce(aktif, true) = true
  );
$$;

create or replace function private.parent_has_student(target_ogrenci_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from veliler
    where user_id = auth.uid()
      and ogrenci_id = target_ogrenci_id
      and coalesce(aktif, true) = true
  );
$$;

create or replace function private.personel_school_id()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select okul_id
  from personel
  where user_id = auth.uid()
    and coalesce(aktif, true) = true
  order by id
  limit 1;
$$;

create or replace function private.veli_school_id()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select okul_id
  from veliler
  where user_id = auth.uid()
    and coalesce(aktif, true) = true
  order by id
  limit 1;
$$;

alter table if exists okullar enable row level security;
alter table if exists personel enable row level security;
alter table if exists veliler enable row level security;
alter table if exists ogrenciler enable row level security;
alter table if exists siniflar enable row level security;
alter table if exists aidatlar enable row level security;
alter table if exists aktiviteler enable row level security;
alter table if exists duyurular enable row level security;
alter table if exists mesajlar enable row level security;
alter table if exists yoklama enable row level security;
alter table if exists servis enable row level security;
alter table if exists gelisim enable row level security;
alter table if exists gunluk_rapor enable row level security;
alter table if exists yemek_listesi enable row level security;
alter table if exists etkinlikler enable row level security;
alter table if exists bildirimler enable row level security;
alter table if exists fotograflar enable row level security;

drop policy if exists "okullar_select_scoped" on okullar;
create policy "okullar_select_scoped"
on okullar
for select
to authenticated
using (
  private.is_staff_of_school(id)
  or private.is_parent_of_school(id)
);

drop policy if exists "okullar_update_admin_only" on okullar;
create policy "okullar_update_admin_only"
on okullar
for update
to authenticated
using (private.is_admin_of_school(id))
with check (private.is_admin_of_school(id));

drop policy if exists "personel_select_scoped" on personel;
create policy "personel_select_scoped"
on personel
for select
to authenticated
using (
  user_id = auth.uid()
  or private.is_admin_of_school(okul_id)
  or (
    private.is_parent_of_school(okul_id)
    and coalesce(aktif, true) = true
    and lower(coalesce(rol, '')) in ('ogretmen', 'yardimci', 'mudur')
  )
);

drop policy if exists "personel_insert_admin_only" on personel;
create policy "personel_insert_admin_only"
on personel
for insert
to authenticated
with check (private.is_admin_of_school(okul_id));

drop policy if exists "personel_update_scoped" on personel;
create policy "personel_update_scoped"
on personel
for update
to authenticated
using (
  user_id = auth.uid()
  or private.is_admin_of_school(okul_id)
)
with check (
  user_id = auth.uid()
  or private.is_admin_of_school(okul_id)
);

drop policy if exists "veliler_select_scoped" on veliler;
create policy "veliler_select_scoped"
on veliler
for select
to authenticated
using (
  user_id = auth.uid()
  or private.is_admin_of_school(okul_id)
  or private.is_staff_of_school(okul_id)
);

drop policy if exists "veliler_insert_staff_only" on veliler;
create policy "veliler_insert_staff_only"
on veliler
for insert
to authenticated
with check (private.is_staff_of_school(okul_id));

drop policy if exists "veliler_update_scoped" on veliler;
create policy "veliler_update_scoped"
on veliler
for update
to authenticated
using (
  user_id = auth.uid()
  or private.is_staff_of_school(okul_id)
)
with check (
  user_id = auth.uid()
  or private.is_staff_of_school(okul_id)
);

drop policy if exists "ogrenciler_select_scoped" on ogrenciler;
create policy "ogrenciler_select_scoped"
on ogrenciler
for select
to authenticated
using (
  private.is_staff_of_school(okul_id)
  or private.parent_has_student(id)
);

drop policy if exists "ogrenciler_insert_staff_only" on ogrenciler;
create policy "ogrenciler_insert_staff_only"
on ogrenciler
for insert
to authenticated
with check (private.is_staff_of_school(okul_id));

drop policy if exists "ogrenciler_update_staff_only" on ogrenciler;
create policy "ogrenciler_update_staff_only"
on ogrenciler
for update
to authenticated
using (private.is_staff_of_school(okul_id))
with check (private.is_staff_of_school(okul_id));

drop policy if exists "siniflar_select_school_only" on siniflar;
create policy "siniflar_select_school_only"
on siniflar
for select
to authenticated
using (
  private.is_staff_of_school(okul_id)
  or private.is_parent_of_school(okul_id)
);

drop policy if exists "siniflar_write_staff_only" on siniflar;
create policy "siniflar_write_staff_only"
on siniflar
for all
to authenticated
using (private.is_staff_of_school(okul_id))
with check (private.is_staff_of_school(okul_id));

drop policy if exists "aidatlar_select_scoped" on aidatlar;
create policy "aidatlar_select_scoped"
on aidatlar
for select
to authenticated
using (
  private.is_admin_of_school(okul_id)
  or private.parent_has_student(ogrenci_id)
);

drop policy if exists "aidatlar_write_admin_only" on aidatlar;
create policy "aidatlar_write_admin_only"
on aidatlar
for all
to authenticated
using (private.is_admin_of_school(okul_id))
with check (private.is_admin_of_school(okul_id));

drop policy if exists "aktiviteler_select_scoped" on aktiviteler;
create policy "aktiviteler_select_scoped"
on aktiviteler
for select
to authenticated
using (
  private.is_staff_of_school(okul_id)
  or (private.parent_has_student(ogrenci_id) and coalesce(veli_gosterilsin, false) = true)
);

drop policy if exists "aktiviteler_write_staff_only" on aktiviteler;
create policy "aktiviteler_write_staff_only"
on aktiviteler
for all
to authenticated
using (private.is_staff_of_school(okul_id))
with check (private.is_staff_of_school(okul_id));

drop policy if exists "duyurular_select_school_only" on duyurular;
create policy "duyurular_select_school_only"
on duyurular
for select
to authenticated
using (
  private.is_staff_of_school(okul_id)
  or private.is_parent_of_school(okul_id)
);

drop policy if exists "duyurular_write_staff_only" on duyurular;
create policy "duyurular_write_staff_only"
on duyurular
for all
to authenticated
using (private.is_staff_of_school(okul_id))
with check (private.is_staff_of_school(okul_id));

drop policy if exists "mesajlar_select_scoped" on mesajlar;
create policy "mesajlar_select_scoped"
on mesajlar
for select
to authenticated
using (
  private.is_staff_of_school(okul_id)
  or private.parent_has_student(ogrenci_id)
);

drop policy if exists "mesajlar_insert_scoped" on mesajlar;
create policy "mesajlar_insert_scoped"
on mesajlar
for insert
to authenticated
with check (
  private.is_staff_of_school(okul_id)
  or private.parent_has_student(ogrenci_id)
);

drop policy if exists "mesajlar_update_scoped" on mesajlar;
create policy "mesajlar_update_scoped"
on mesajlar
for update
to authenticated
using (
  private.is_staff_of_school(okul_id)
  or private.parent_has_student(ogrenci_id)
)
with check (
  private.is_staff_of_school(okul_id)
  or private.parent_has_student(ogrenci_id)
);

drop policy if exists "yoklama_select_scoped" on yoklama;
create policy "yoklama_select_scoped"
on yoklama
for select
to authenticated
using (
  private.is_staff_of_school(okul_id)
  or private.parent_has_student(ogrenci_id)
);

drop policy if exists "yoklama_write_staff_only" on yoklama;
create policy "yoklama_write_staff_only"
on yoklama
for all
to authenticated
using (private.is_staff_of_school(okul_id))
with check (private.is_staff_of_school(okul_id));

drop policy if exists "servis_select_scoped" on servis;
create policy "servis_select_scoped"
on servis
for select
to authenticated
using (
  private.is_staff_of_school(okul_id)
  or private.parent_has_student(ogrenci_id)
);

drop policy if exists "servis_write_staff_only" on servis;
create policy "servis_write_staff_only"
on servis
for all
to authenticated
using (private.is_staff_of_school(okul_id))
with check (private.is_staff_of_school(okul_id));

drop policy if exists "gelisim_select_scoped" on gelisim;
create policy "gelisim_select_scoped"
on gelisim
for select
to authenticated
using (
  private.is_staff_of_school(okul_id)
  or private.parent_has_student(ogrenci_id)
);

drop policy if exists "gelisim_write_staff_only" on gelisim;
create policy "gelisim_write_staff_only"
on gelisim
for all
to authenticated
using (private.is_staff_of_school(okul_id))
with check (private.is_staff_of_school(okul_id));

drop policy if exists "gunluk_rapor_select_scoped" on gunluk_rapor;
create policy "gunluk_rapor_select_scoped"
on gunluk_rapor
for select
to authenticated
using (
  private.is_staff_of_school(okul_id)
  or private.parent_has_student(ogrenci_id)
);

drop policy if exists "gunluk_rapor_write_staff_only" on gunluk_rapor;
create policy "gunluk_rapor_write_staff_only"
on gunluk_rapor
for all
to authenticated
using (private.is_staff_of_school(okul_id))
with check (private.is_staff_of_school(okul_id));

drop policy if exists "yemek_listesi_select_school_only" on yemek_listesi;
create policy "yemek_listesi_select_school_only"
on yemek_listesi
for select
to authenticated
using (
  private.is_staff_of_school(okul_id)
  or private.is_parent_of_school(okul_id)
);

drop policy if exists "yemek_listesi_write_staff_only" on yemek_listesi;
create policy "yemek_listesi_write_staff_only"
on yemek_listesi
for all
to authenticated
using (private.is_staff_of_school(okul_id))
with check (private.is_staff_of_school(okul_id));

drop policy if exists "etkinlikler_select_school_only" on etkinlikler;
create policy "etkinlikler_select_school_only"
on etkinlikler
for select
to authenticated
using (
  private.is_staff_of_school(okul_id)
  or private.is_parent_of_school(okul_id)
);

drop policy if exists "etkinlikler_write_staff_only" on etkinlikler;
create policy "etkinlikler_write_staff_only"
on etkinlikler
for all
to authenticated
using (private.is_staff_of_school(okul_id))
with check (private.is_staff_of_school(okul_id));

drop policy if exists "bildirimler_select_scoped" on bildirimler;
create policy "bildirimler_select_scoped"
on bildirimler
for select
to authenticated
using (
  private.is_staff_of_school(okul_id)
  or private.parent_has_student(ogrenci_id)
);

drop policy if exists "bildirimler_write_staff_only" on bildirimler;
create policy "bildirimler_write_staff_only"
on bildirimler
for all
to authenticated
using (private.is_staff_of_school(okul_id))
with check (private.is_staff_of_school(okul_id));

drop policy if exists "fotograflar_select_school_only" on fotograflar;
create policy "fotograflar_select_school_only"
on fotograflar
for select
to authenticated
using (
  private.is_staff_of_school(okul_id)
  or private.is_parent_of_school(okul_id)
);

drop policy if exists "fotograflar_write_staff_only" on fotograflar;
create policy "fotograflar_write_staff_only"
on fotograflar
for all
to authenticated
using (private.is_staff_of_school(okul_id))
with check (private.is_staff_of_school(okul_id));

drop policy if exists "storage_photos_select_school_only" on storage.objects;
create policy "storage_photos_select_school_only"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'photos'
  and (
    private.is_staff_of_school(split_part(name, '/', 1)::bigint)
    or private.is_parent_of_school(split_part(name, '/', 1)::bigint)
  )
);

drop policy if exists "storage_photos_write_staff_only" on storage.objects;
create policy "storage_photos_write_staff_only"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'photos'
  and private.is_staff_of_school(split_part(name, '/', 1)::bigint)
);

drop policy if exists "storage_logos_write_admin_only" on storage.objects;
create policy "storage_logos_write_admin_only"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'logos'
  and private.is_admin_of_school(split_part(name, '/', 1)::bigint)
);

