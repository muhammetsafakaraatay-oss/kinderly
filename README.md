# Kinderly Web

Next.js tabanli web paneli, mobil uygulamadaki Supabase auth yapisi ile hizalanmistir.

## Kurulum

1. `.env.example` dosyasini kopyalayip `.env.local` olustur:

```bash
cp .env.example .env.local
```

2. Supabase bilgilerini gir:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

3. Bagimliliklari kur ve calistir:

```bash
npm install
npm run dev
```

## Giris

- Web girisi artik email ve sifre ile yapilir.
- Kullanici rolu Supabase uzerinden cozulur.
- Giris yapan kullanici kendi okul slug ve rol yoluna otomatik yonlendirilir.
- `/kayit` akisi ile yeni okul + admin hesabi olusturulabilir.

## Beklenen Yapi

- `personel.user_id` ve `veliler.user_id` alanlari auth kullanicisi ile eslesmeli
- `okullar.slug` dolu olmali
- Rol alanlari `admin`, `ogretmen`, `veli` varyasyonlariyla uyumlu olmali

## Kontrol

```bash
npx tsc --noEmit --incremental false
```

## Supabase Notlari

- `supabase/migrations/20260412_create_default_aidat_trigger.sql` dosyasi yeni ogrenci eklendiginde varsayilan aidat olusturur.
- Supabase SQL Editor'da bu migration'i calistirin ya da CLI migration akisina dahil edin.

## Deploy

Detayli deploy adimlari icin [DEPLOY_VERCEL.md](/Users/safa/Desktop/kinderly-web/DEPLOY_VERCEL.md:1) dosyasina bak.
