# Kinderly Web Deploy

## Gerekli Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Lokal Kontrol

```bash
npm install
npx tsc --noEmit --incremental false
npm run build
```

## Vercel

1. Projeyi Vercel'e bagla
2. Yukaridaki environment variable'lari Production, Preview ve Development icin ekle
3. Build command olarak varsayilan `next build` kullan
4. Deploy sonrasi su akislari test et:

- `/giris` uzerinden admin girisi
- `/giris` uzerinden ogretmen girisi
- `/giris` uzerinden veli girisi
- Rolun dogru slug sayfasina yonlenmesi
- Cikis yapinca `/giris` sayfasina donmesi

## Not

Web uygulama gercek Supabase auth kullandigi icin `personel.user_id` ve `veliler.user_id` alanlari auth kullanicilariyla eslesmelidir.
