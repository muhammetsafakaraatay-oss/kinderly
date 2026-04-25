-- The mobile app saves attendance with:
-- upsert(..., { onConflict: 'okul_id,ogrenci_id,tarih' }).
-- Postgres/PostgREST requires a matching unique constraint for that conflict target.

delete from public.yoklama a
using public.yoklama b
where a.ctid < b.ctid
  and a.okul_id = b.okul_id
  and a.ogrenci_id = b.ogrenci_id
  and a.tarih = b.tarih;

alter table public.yoklama
  add constraint yoklama_okul_ogrenci_tarih_key
  unique (okul_id, ogrenci_id, tarih);

create index if not exists idx_yoklama_okul_tarih
  on public.yoklama (okul_id, tarih);
