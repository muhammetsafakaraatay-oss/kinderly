alter table public.teslim_kayitlari
  add column if not exists teslim_veli_id bigint references public.veliler(id) on delete set null,
  add column if not exists kayit_kaynagi text not null default 'staff_manual';

create index if not exists idx_teslim_kayitlari_veli
  on public.teslim_kayitlari (teslim_veli_id, created_at desc);

create or replace function public.record_parent_qr_pickup(
  target_okul_id integer,
  target_ogrenci_id bigint,
  target_veli_id bigint,
  target_tip text,
  target_pin text,
  target_notlar text default null
)
returns public.teslim_kayitlari
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  selected_contact public.veliler%rowtype;
  inserted_record public.teslim_kayitlari%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Oturum bulunamadı.';
  end if;

  if target_tip not in ('check_in', 'check_out') then
    raise exception 'Geçersiz teslim tipi.';
  end if;

  if coalesce(trim(target_pin), '') !~ '^[0-9]{4}$' then
    raise exception 'PIN 4 haneli olmalı.';
  end if;

  if not exists (
    select 1
    from public.veliler v
    where v.user_id = auth.uid()
      and v.okul_id = target_okul_id
      and v.ogrenci_id = target_ogrenci_id
      and coalesce(v.aktif, true) = true
      and coalesce(v.iliski_tipi, 'parent') in ('parent', 'family')
  ) then
    raise exception 'Bu öğrenci için veli yetkisi bulunamadı.';
  end if;

  select *
  into selected_contact
  from public.veliler v
  where v.id = target_veli_id
    and v.okul_id = target_okul_id
    and v.ogrenci_id = target_ogrenci_id
    and coalesce(v.aktif, true) = true
    and (
      coalesce(v.teslim_alabilir, false) = true
      or coalesce(v.iliski_tipi, 'parent') in ('parent', 'family')
    )
  limit 1;

  if selected_contact.id is null then
    raise exception 'Teslim yetkilisi bulunamadı.';
  end if;

  if selected_contact.teslim_pin is distinct from trim(target_pin) then
    raise exception 'PIN doğrulanamadı.';
  end if;

  insert into public.teslim_kayitlari (
    okul_id,
    ogrenci_id,
    tip,
    teslim_alan_ad,
    teslim_alan_yakinlik,
    teslim_pin,
    teslim_veli_id,
    kayit_kaynagi,
    notlar,
    kaydeden_user_id
  )
  values (
    target_okul_id,
    target_ogrenci_id,
    target_tip,
    selected_contact.ad_soyad,
    selected_contact.yakinlik,
    trim(target_pin),
    selected_contact.id,
    'parent_qr',
    nullif(trim(coalesce(target_notlar, '')), ''),
    auth.uid()
  )
  returning * into inserted_record;

  return inserted_record;
end;
$$;

grant execute on function public.record_parent_qr_pickup(integer, bigint, bigint, text, text, text) to authenticated;

alter function public.record_parent_qr_pickup(integer, bigint, bigint, text, text, text) owner to postgres;
