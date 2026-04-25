alter table if exists public.veliler
  add column if not exists iliski_tipi text default 'parent',
  add column if not exists yakinlik text,
  add column if not exists teslim_alabilir boolean default true,
  add column if not exists acil_durum_kisisi boolean default false,
  add column if not exists notlar text,
  add column if not exists davet_gonderildi_at timestamptz,
  add column if not exists son_davet_durumu text;

update public.veliler
set iliski_tipi = 'parent'
where iliski_tipi is null;

update public.veliler
set
  teslim_alabilir = coalesce(teslim_alabilir, true),
  acil_durum_kisisi = coalesce(acil_durum_kisisi, false);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'veliler_iliski_tipi_check'
  ) then
    alter table public.veliler
      add constraint veliler_iliski_tipi_check
      check (iliski_tipi in ('parent', 'family', 'approved_pickup', 'emergency'));
  end if;
end;
$$;

create index if not exists idx_veliler_okul_email
  on public.veliler (okul_id, lower(email))
  where email is not null;

create index if not exists idx_veliler_okul_ogrenci
  on public.veliler (okul_id, ogrenci_id);

create index if not exists idx_veliler_user_active_type
  on public.veliler (user_id, aktif, iliski_tipi)
  where user_id is not null;
