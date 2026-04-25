alter table if exists public.servis
  add column if not exists rota_adi text,
  add column if not exists sofor_adi text,
  add column if not exists arac_plaka text,
  add column if not exists aktif boolean default true,
  add column if not exists created_at timestamptz default now();

update public.servis
set rota_adi = coalesce(nullif(rota_adi, ''), 'Tanimsiz Rota')
where rota_adi is null;

alter table if exists public.servis
  alter column rota_adi set not null;

alter table if exists public.servis_ogrenci
  add column if not exists yon text check (yon in ('sabah', 'aksam', 'ikiyonlu'));

update public.servis_ogrenci
set yon = coalesce(yon, 'ikiyonlu')
where yon is null;

alter table if exists public.aidatlar
  add column if not exists son_odeme date;

update public.aidatlar
set son_odeme = coalesce(son_odeme, son_odeme_tarihi)
where son_odeme is null
  and son_odeme_tarihi is not null;
