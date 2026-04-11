'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Instrument_Serif, DM_Sans } from 'next/font/google'
import { hasSupabaseEnv, supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { rolePath } from '@/lib/auth-helpers'

const serif = Instrument_Serif({ subsets: ['latin'], weight: '400', variable: '--font-serif' })
const sans = DM_Sans({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'], variable: '--font-sans' })

const trustStats = [
  ['512+', 'aktif okul'],
  ['%98', 'yenileme orani'],
  ['23 saat', 'aylik zaman kazanci'],
] as const

const supportPoints = [
  'Yöneticiler, öğretmenler ve veliler tek hesap altyapısında buluşur.',
  'Bildirim, aidat ve gunluk akislara ayni oturumdan erisirsiniz.',
  'Yeni premium onboarding ile acilan okul paneli burada devam eder.',
] as const

export default function GirisPage() {
  const router = useRouter()
  const { loading: authLoading, session, role, okul } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email])
  const canSubmit = normalizedEmail.length > 0 && password.trim().length > 0 && !submitting && !authLoading
  const redirectPath = rolePath(role)
  const roleResolutionError =
    !authLoading && session && !redirectPath
      ? 'Giriş tamamlandı fakat bu hesap için panel rolü bulunamadı. Lütfen destek ile iletişime geçin.'
      : ''

  const buttonLabel =
    submitting
      ? 'Giriş yapılıyor...'
      : authLoading && session
        ? 'Panel hazirlaniyor...'
        : 'Panele giriş yap'

  useEffect(() => {
    if (authLoading) return

    if (session && okul?.slug && redirectPath) {
      router.replace(`/${okul.slug}/${redirectPath}`)
    }
  }, [authLoading, okul?.slug, redirectPath, router, session])

  async function handleLogin() {
    if (!hasSupabaseEnv) {
      setError('Supabase ayarlari Vercel ortaminda eksik. NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY eklenmeli.')
      return
    }

    const normalizedPassword = password.trim()

    if (!normalizedEmail || !normalizedPassword) {
      setError('Email ve şifre zorunlu.')
      return
    }

    setSubmitting(true)
    setError('')

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: normalizedPassword,
    })

    if (signInError) {
      setError(
        signInError.message === 'Invalid login credentials'
          ? 'Email veya şifre hatalı.'
          : signInError.message
      )
    }

    setSubmitting(false)
  }

  return (
    <main className={`${serif.variable} ${sans.variable} min-h-screen overflow-hidden bg-[#060a06] font-sans text-white`}>
      <style>{`
        :root {
          --green: #4ade80;
          --green-strong: #86efac;
          --green-dim: rgba(74, 222, 128, 0.1);
          --border: rgba(74, 222, 128, 0.14);
          --surface: #0b120b;
          --surface-soft: rgba(255, 255, 255, 0.03);
          --muted: rgba(255, 255, 255, 0.62);
        }
        .serif {
          font-family: var(--font-serif);
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(74,222,128,0.16),transparent_45%)]" />
        <div className="absolute left-1/2 top-[-18%] h-[460px] w-[460px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(134,239,172,0.22),transparent_70%)] blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(74,222,128,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(74,222,128,0.04)_1px,transparent_1px)] bg-[size:44px_44px] opacity-40" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-[1440px] flex-col px-[5%] pb-10 pt-8">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--green)] font-black text-[#061006]">
              K
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Kinderly</div>
              <div className="text-xs text-[var(--muted)]">Premium okul operasyonu</div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/kayit"
              className="hidden rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted)] transition-colors hover:text-white sm:inline-flex"
            >
              Yeni okul kur
            </Link>
            <Link
              href="/"
              className="rounded-full border border-[var(--border)] bg-white/[0.03] px-4 py-2 text-sm text-white transition-colors hover:bg-white/[0.06]"
            >
              Landing page
            </Link>
          </div>
        </header>

        <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
          <section className="max-w-[640px]">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--green-dim)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--green-strong)]">
              Tek giriş, tüm okul akışı
            </div>

            <h1 className="serif mt-6 text-[clamp(3.1rem,6.8vw,6.4rem)] leading-[0.92] tracking-[-0.06em] text-white">
              Ekip, veli ve yönetim
              <br />
              ayni premium sistemde
              <br />
              bulusuyor.
            </h1>

            <p className="mt-6 max-w-[560px] text-lg leading-8 text-[var(--muted)]">
              Yeni landing ve onboarding deneyiminin devamında, oturum açan her kullanıcı kendi rolü için hazırlanan panele
              otomatik yönlenir. Daha az karmaşa, daha hızlı operasyon, daha sakin bir okul günü.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {trustStats.map(([value, label]) => (
                <div key={label} className="rounded-[24px] border border-[var(--border)] bg-white/[0.03] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
                  <div className="text-2xl font-semibold tracking-[-0.04em] text-white">{value}</div>
                  <div className="mt-2 text-sm text-[var(--muted)]">{label}</div>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-[28px] border border-[var(--border)] bg-[linear-gradient(135deg,rgba(74,222,128,0.12),rgba(255,255,255,0.03))] p-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-[var(--border)] bg-[#0b140c] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--green-strong)]">
                  Login flow
                </span>
                <span className="text-sm text-[var(--muted)]">Yönetici, öğretmen ve veli rollerini aynı oturum altyapısında çözer.</span>
              </div>

              <div className="mt-5 space-y-4">
                {supportPoints.map((item, index) => (
                  <div key={item} className="flex items-start gap-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[#081008] text-sm font-semibold text-[var(--green)]">
                      0{index + 1}
                    </div>
                    <p className="pt-1 text-sm leading-7 text-[var(--muted)]">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="relative">
            <div className="absolute inset-x-6 top-4 h-24 rounded-full bg-[radial-gradient(circle,rgba(74,222,128,0.28),transparent_72%)] blur-3xl" />

            <div className="relative rounded-[32px] border border-[var(--border)] bg-[rgba(11,18,11,0.88)] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--green-strong)]">Panel girişi</div>
                  <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">Hesabınızla devam edin</h2>
                </div>
                <div className="rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-xs text-[var(--muted)]">
                  Mobil ile ayni hesap
                </div>
              </div>

              <p className="mt-3 max-w-[460px] text-sm leading-7 text-[var(--muted)]">
                Oturum açtığınız anda hesabınızın rolünü algılar, sizi okul slug&apos;iniz altındaki doğru panele yönlendiririz.
              </p>

              {!hasSupabaseEnv && (
                <div className="mt-6 rounded-[22px] border border-amber-300/20 bg-amber-400/10 px-4 py-4 text-sm leading-6 text-amber-100">
                  Vercel ortam degiskenleri eksik. `NEXT_PUBLIC_SUPABASE_URL` ve `NEXT_PUBLIC_SUPABASE_ANON_KEY`
                  tanimlanmadan web girisi calismaz.
                </div>
              )}

              <div className="mt-8 space-y-5">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Email</label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && canSubmit && handleLogin()}
                    placeholder="ornek@okulunuz.com"
                    autoComplete="email"
                    className="w-full rounded-[20px] border border-[var(--border)] bg-white/[0.03] px-4 py-4 text-sm font-medium text-white outline-none transition-all placeholder:text-white/25 focus:border-[var(--green)] focus:bg-white/[0.05]"
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Şifre</label>
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)] transition-colors hover:text-white"
                    >
                      {showPassword ? 'Gizle' : 'Göster'}
                    </button>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && canSubmit && handleLogin()}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full rounded-[20px] border border-[var(--border)] bg-white/[0.03] px-4 py-4 text-sm font-medium text-white outline-none transition-all placeholder:text-white/25 focus:border-[var(--green)] focus:bg-white/[0.05]"
                  />
                </div>
              </div>

              <button
                onClick={handleLogin}
                disabled={!canSubmit}
                className="mt-7 w-full rounded-[20px] bg-[var(--green)] px-5 py-4 text-base font-semibold text-[#051005] transition-all hover:translate-y-[-1px] hover:bg-[#7bf0a6] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {buttonLabel}
              </button>

              {(error || roleResolutionError) && (
                <p className="mt-4 text-sm leading-6 text-[#fda4af]">{error || roleResolutionError}</p>
              )}

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[20px] border border-[var(--border)] bg-white/[0.02] p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--green-strong)]">Yeni okul</div>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">3 adımlı premium onboarding ile dakikalar içinde kuruluma başlayın.</p>
                  <Link href="/kayit" className="mt-4 inline-flex text-sm font-semibold text-white transition-colors hover:text-[var(--green-strong)]">
                    Kayıt sayfasına git
                  </Link>
                </div>

                <div className="rounded-[20px] border border-[var(--border)] bg-white/[0.02] p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--green-strong)]">Destek</div>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Kurulum, erişim veya davet sorunlarında ekip hızlıca yardımcı olur.</p>
                  <a
                    href="mailto:info@kinderly.app"
                    className="mt-4 inline-flex text-sm font-semibold text-white transition-colors hover:text-[var(--green-strong)]"
                  >
                    info@kinderly.app
                  </a>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
