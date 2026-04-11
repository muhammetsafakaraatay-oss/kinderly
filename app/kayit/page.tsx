'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { isValidSlug, slugifySchoolName } from '@/lib/slug'

export default function KayitPage() {
  const router = useRouter()
  const [okulAdi, setOkulAdi] = useState('')
  const [slug, setSlug] = useState('')
  const [adSoyad, setAdSoyad] = useState('')
  const [email, setEmail] = useState('')
  const [sifre, setSifre] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)

  const suggestedSlug = useMemo(() => slugifySchoolName(okulAdi), [okulAdi])
  const currentSlug = slugTouched ? slug : suggestedSlug

  async function handleSubmit() {
    const finalSlug = slugTouched ? slugifySchoolName(slug) : suggestedSlug

    if (!okulAdi.trim() || !finalSlug || !adSoyad.trim() || !email.trim() || !sifre.trim()) {
      setError('Tum alanlar zorunludur.')
      return
    }

    if (!isValidSlug(finalSlug)) {
      setError('Okul kodu sadece kucuk harf, rakam ve tire icerebilir.')
      return
    }

    if (sifre.trim().length < 8) {
      setError('Sifre en az 8 karakter olmali.')
      return
    }

    setSubmitting(true)
    setError('')

    const response = await fetch('/api/kayit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        okulAdi,
        slug: finalSlug,
        adSoyad,
        email,
        sifre,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      setSubmitting(false)
      setError(result.error ?? 'Kayit olusturulamadi.')
      return
    }

    await new Promise((resolve) => setTimeout(resolve, 500))

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: result.email ?? email.trim().toLowerCase(),
      password: sifre.trim(),
    })

    if (signInError) {
      setSubmitting(false)
      setError(signInError.message)
      return
    }

    router.replace(`/${result.slug}/admin`)
  }

  return (
    <div className="min-h-screen bg-[#0f1a14] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-[#0d5c3a] rounded-2xl flex items-center justify-center text-2xl">🌱</div>
            <span className="text-2xl font-black text-white tracking-tight">Kinderly</span>
          </Link>
          <p className="text-white/50 text-sm">Okulunu dakikalar icinde ac ve admin panelini hemen kullanmaya basla.</p>
        </div>

        <div className="rounded-[32px] bg-white p-8 md:p-10 shadow-[0_40px_120px_rgba(0,0,0,0.35)]">
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-black text-[#0f1a14] tracking-tight">Okul Kaydi</h1>
            <p className="text-sm text-[#5a7265] mt-2">Kaydolduktan sonra otomatik olarak admin paneline yonlendirilirsin.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <label className="block md:col-span-2">
              <span className="block text-xs font-bold text-[#5a7265] mb-2 uppercase tracking-wide">Okul Adi</span>
              <input
                value={okulAdi}
                onChange={(event) => setOkulAdi(event.target.value)}
                placeholder="Ornek: Renkli Dusler Anaokulu"
                className="w-full border-2 border-[#e2e8f0] rounded-2xl px-4 py-3.5 text-sm font-semibold outline-none focus:border-[#0d5c3a] transition-colors text-[#0f1a14]"
              />
            </label>

            <label className="block">
              <span className="block text-xs font-bold text-[#5a7265] mb-2 uppercase tracking-wide">Okul Kodu / Slug</span>
              <input
                value={currentSlug}
                onChange={(event) => {
                  setSlugTouched(true)
                  setSlug(slugifySchoolName(event.target.value))
                }}
                placeholder="renkli-dusler"
                className="w-full border-2 border-[#e2e8f0] rounded-2xl px-4 py-3.5 text-sm font-semibold outline-none focus:border-[#0d5c3a] transition-colors text-[#0f1a14]"
              />
              <span className="mt-2 block text-xs text-[#5a7265]">Sadece kucuk harf, rakam ve tire kullanilir.</span>
            </label>

            <label className="block">
              <span className="block text-xs font-bold text-[#5a7265] mb-2 uppercase tracking-wide">Admin Ad Soyad</span>
              <input
                value={adSoyad}
                onChange={(event) => setAdSoyad(event.target.value)}
                placeholder="Ornek: Ayse Yilmaz"
                className="w-full border-2 border-[#e2e8f0] rounded-2xl px-4 py-3.5 text-sm font-semibold outline-none focus:border-[#0d5c3a] transition-colors text-[#0f1a14]"
              />
            </label>

            <label className="block">
              <span className="block text-xs font-bold text-[#5a7265] mb-2 uppercase tracking-wide">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="ornek@email.com"
                className="w-full border-2 border-[#e2e8f0] rounded-2xl px-4 py-3.5 text-sm font-semibold outline-none focus:border-[#0d5c3a] transition-colors text-[#0f1a14]"
              />
            </label>

            <label className="block">
              <span className="block text-xs font-bold text-[#5a7265] mb-2 uppercase tracking-wide">Sifre</span>
              <input
                type="password"
                value={sifre}
                onChange={(event) => setSifre(event.target.value)}
                placeholder="En az 8 karakter"
                className="w-full border-2 border-[#e2e8f0] rounded-2xl px-4 py-3.5 text-sm font-semibold outline-none focus:border-[#0d5c3a] transition-colors text-[#0f1a14]"
              />
            </label>
          </div>

          {error && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 rounded-2xl bg-[#0d5c3a] px-6 py-4 text-sm font-bold text-white transition-colors hover:bg-[#1a7a50] disabled:opacity-60"
            >
              {submitting ? 'Kayit olusturuluyor...' : 'Kaydol'}
            </button>
            <Link
              href="/giris"
              className="flex items-center justify-center rounded-2xl border border-[rgba(13,92,58,0.16)] px-6 py-4 text-sm font-bold text-[#0f1a14] transition-colors hover:border-[#0d5c3a] hover:text-[#0d5c3a]"
            >
              Zaten hesabim var
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
